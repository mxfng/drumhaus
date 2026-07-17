/**
 * Boot restore for the session document (docs/preset-persistence.md,
 * "Session storage: the document replaces five persists", PR 5).
 *
 * bootstrapSession() runs SYNCHRONOUSLY from the app entry (src/app/main.tsx)
 * before React mounts. Rationale: the retired per-store persists rehydrated
 * synchronously at import time, so first paint always showed real state; a
 * post-paint effect restore would flash init defaults. Pre-mount application
 * is safe because applyPresetDocument is a plain function over store
 * setters and the engine bridge performs an explicit initial push at mount;
 * the retired transport onRehydrateStorage proved the engine tolerates
 * pre-init tempo/swing commands for years.
 *
 * Boot decision ladder (after the library phase, see bootstrapLibrary):
 * 1. Session envelope present  -> apply it, restore the clean hash from the
 *    envelope (a session that was closed dirty must reload dirty).
 * 2. Session envelope corrupt  -> quarantine the payload (never destroy
 *    user data), apply the default preset.
 * 3. No session, legacy keys   -> one-time adoption: replay the retired
 *    persist migrations, apply, write the session envelope, and only after
 *    that write succeeds delete the four retired keys.
 * 4. Nothing at all            -> first visit: apply the default preset,
 *    the same loadPresetFile(init()) boot the app always performed.
 */

import { init } from "@/core/dh";
import {
  migrateV1ToDocument,
  validatePresetFileV1,
} from "@/features/preset/document";
import { applyPresetDocument } from "@/features/preset/document/apply";
import { snapshotPresetDocument } from "@/features/preset/document/snapshot";
import { adoptLegacyPresetLibrary } from "@/features/preset/library/adoption";
import { hydrateLibrarySync } from "@/features/preset/library/library";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import {
  assembleLegacySession,
  deleteRetiredLegacyStorageKeys,
  hasLegacySessionData,
} from "./legacy-adopter";
import {
  quarantineSessionPayload,
  readSessionEnvelope,
  writeSessionEnvelope,
  type SessionEnvelope,
} from "./session-storage";

/**
 * The default-preset fallback, identical to the loadPresetFile(init()) call
 * the old boot made on first visit. init() ships in the bundle, so a failure
 * here is a build bug: log it and leave the stores on their create()
 * defaults rather than break boot.
 */
function applyInitFallback(): void {
  try {
    applyPresetDocument(init());
  } catch (error) {
    console.error("Drumhaus boot: failed to apply the default preset", error);
  }
}

function restoreSession(envelope: SessionEnvelope): void {
  // The selected A/B/C/D pad is session-UI state (decision 7), rehydrated
  // from drumhaus-session-ui by the pattern store's persist at import time.
  // apply derives the variation from the chain's first step, so re-assert
  // the user's selection afterwards.
  const selectedVariation = usePatternStore.getState().variation;

  applyPresetDocument(envelope.document);

  usePatternStore.getState().setVariation(selectedVariation);

  // apply set the clean hash to the post-apply snapshot (which always reads
  // clean); the envelope's hash is the authoritative baseline, so a session
  // closed with unsaved changes reloads with unsaved changes.
  usePresetMetaStore.getState().setCleanHash(envelope.cleanHash);
}

/** One-time adoption of the five retired per-store persist envelopes. */
function adoptLegacySession(): void {
  const adopted = assembleLegacySession();
  const document = migrateV1ToDocument(validatePresetFileV1(adopted.file));

  applyPresetDocument(document);

  // Seed the session-UI key with the legacy envelope's selected pad; the
  // pattern store's persist writes drumhaus-session-ui on set.
  usePatternStore.getState().setVariation(adopted.variation);

  const { currentPresetMeta, currentKitMeta, cleanHash } =
    usePresetMetaStore.getState();
  const written = writeSessionEnvelope(
    snapshotPresetDocument(currentPresetMeta, currentKitMeta),
    cleanHash,
  );

  // Delete-only-after-write: the retired keys survive until the session
  // document is safely in storage.
  if (written) {
    deleteRetiredLegacyStorageKeys();
  } else {
    console.warn(
      "Drumhaus boot: session write failed during legacy adoption; " +
        "keeping the legacy storage keys",
    );
  }
}

/**
 * Adopt the legacy library once and hydrate the in-memory library from the
 * per-preset entries (features/preset/library). Runs BEFORE the session
 * ladder, deliberately, for two reasons:
 *
 * - applyPresetDocument registers a restored non-factory session preset via
 *   addCustomPreset, whose dedupe (and best-effort index write) must see
 *   the real library, not an empty one;
 * - the legacy library adoption is what stashes the retired preset-meta
 *   fields (legacy-preset-meta-capture.ts) that the session adopter reads.
 *
 * Hydration is synchronous through the storage backend's sync internals
 * (the public library interface stays async, decision 14): the e2e contract
 * is that a saved preset is in the select immediately after reload, and a
 * post-mount async fill would race first paint.
 */
function bootstrapLibrary(): void {
  try {
    adoptLegacyPresetLibrary();
  } catch (error) {
    // Adoption failure preserves the legacy key (and its backup) for the
    // next attempt; the library simply hydrates whatever entries exist.
    console.error(
      "Drumhaus boot: legacy library adoption failed; " +
        "the legacy preset storage is preserved",
      error,
    );
  }

  try {
    usePresetMetaStore.getState().hydrateLibrary(hydrateLibrarySync());
  } catch (error) {
    console.error("Drumhaus boot: failed to hydrate the preset library", error);
  }
}

/**
 * Restore the working session into the stores. Must run before React
 * mounts; see the module comment.
 */
function bootstrapSession(): void {
  bootstrapLibrary();

  const session = readSessionEnvelope();

  if (session.status === "ok") {
    try {
      restoreSession(session.envelope);
    } catch (error) {
      // Decoded but unappliable (e.g. the kit registry no longer resolves
      // the id): same posture as corrupt - quarantine, never destroy.
      console.error(
        "Drumhaus boot: failed to apply the stored session; quarantining it",
        error,
      );
      quarantineSessionPayload(session.raw);
      applyInitFallback();
    }
    return;
  }

  if (session.status === "corrupt") {
    console.error(
      "Drumhaus boot: the stored session is corrupt; quarantining it",
      session.error,
    );
    quarantineSessionPayload(session.raw);
    applyInitFallback();
    return;
  }

  // No session document yet: adopt the legacy per-store persists once, or
  // treat this as a first visit.
  if (!hasLegacySessionData()) {
    applyInitFallback();
    return;
  }

  try {
    adoptLegacySession();
  } catch (error) {
    // Adoption failure preserves every legacy key for the next attempt (or
    // manual recovery) and boots on the default preset.
    console.error(
      "Drumhaus boot: legacy session adoption failed; " +
        "legacy storage keys preserved",
      error,
    );
    applyInitFallback();
  }
}

export { bootstrapSession };
