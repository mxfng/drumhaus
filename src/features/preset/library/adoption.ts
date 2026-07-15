/**
 * One-time adoption of the legacy preset library (docs/preset-persistence.md,
 * PR 6, decision 9): the retired preset-meta persist held every custom
 * preset as one `customPresets: PresetFileV1[]` array under
 * drumhaus-preset-meta-storage. This module migrates that array into
 * per-preset document entries, eagerly and defensively:
 *
 * - The raw legacy payload is copied UNTOUCHED to drumhaus-library-backup
 *   before anything else (the pre-adoption escape hatch; this PR never
 *   deletes it).
 * - Entries migrate individually through the standard
 *   validate -> migrate pipeline; a failing entry quarantines to its own
 *   key and never blocks the others.
 * - The legacy key is deleted ONLY after every entry is written or
 *   quarantined. Any quota failure stops adoption with the legacy key (and
 *   backup) intact.
 * - Re-running is idempotent: entries already written by an interrupted run
 *   are recognized by id and not rewritten, so a quota failure mid-adoption
 *   simply resumes on the next boot.
 *
 * This module also inherits the PR 5 capture duty: the legacy envelope
 * still carries currentPresetMeta/currentKitMeta on machines that never ran
 * the narrowing build, and the session adopter needs them. Adoption parses
 * the envelope first (before the session ladder consumes the capture) and
 * hands the meta fields to legacy-preset-meta-capture.ts on their way out.
 */

import {
  migrateV1ToDocument,
  StorageFullError,
  validatePresetFileV1,
} from "@/features/preset/document";
import { LEGACY_PRESET_META_STORAGE_KEY } from "@/features/preset/session/legacy-adopter";
import { captureLegacyPresetMeta } from "@/features/preset/session/legacy-preset-meta-capture";
import {
  libraryEntryKey,
  libraryQuarantineKey,
  putLibraryEntrySync,
  readLibraryIndexSync,
  writeLibraryIndexSync,
  type LibraryIndexRow,
} from "./library";
import { getItemSync, putItemSync, removeItemSync } from "./storage";

/** The raw legacy payload, preserved verbatim; never deleted by this PR. */
const LIBRARY_BACKUP_KEY = "drumhaus-library-backup";

/** Best-effort id/name extraction from a raw (unvalidated) legacy preset. */
function rawPresetMeta(entry: unknown): { id?: string; name?: string } {
  if (typeof entry !== "object" || entry === null) return {};
  const meta = (entry as { meta?: unknown }).meta;
  if (typeof meta !== "object" || meta === null) return {};
  const { id, name } = meta as { id?: unknown; name?: unknown };
  return {
    ...(typeof id === "string" ? { id } : {}),
    ...(typeof name === "string" ? { name } : {}),
  };
}

/**
 * Adopt the legacy customPresets array into per-preset entries. Runs inside
 * bootstrapLibrary() on every boot and returns immediately once the legacy
 * key is gone. Synchronous by design: it must complete before the in-memory
 * library hydrates and before the session ladder applies any document.
 */
function adoptLegacyPresetLibrary(): void {
  const raw = getItemSync(LEGACY_PRESET_META_STORAGE_KEY);
  if (raw === null) return;

  // The escape hatch comes first: whatever happens below, the user's raw
  // data survives verbatim under the backup key.
  try {
    putItemSync(LIBRARY_BACKUP_KEY, raw);
  } catch (error) {
    console.error(
      "Drumhaus library adoption: could not write the pre-adoption backup; " +
        "keeping the legacy key and retrying next boot",
      error,
    );
    return;
  }

  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    // The whole envelope is unreadable: there is nothing to migrate, but the
    // payload is safe in the backup, so retire the legacy key.
    console.error(
      "Drumhaus library adoption: the legacy preset-meta envelope is not " +
        `valid JSON; preserved verbatim under "${LIBRARY_BACKUP_KEY}"`,
      error,
    );
    removeItemSync(LEGACY_PRESET_META_STORAGE_KEY);
    return;
  }

  const state =
    typeof envelope === "object" && envelope !== null
      ? (envelope as { state?: unknown; version?: unknown }).state
      : undefined;
  const version =
    typeof envelope === "object" &&
    envelope !== null &&
    typeof (envelope as { version?: unknown }).version === "number"
      ? (envelope as { version: number }).version
      : 0;

  // PR 5 capture duty: pre-v2 envelopes still hold the current preset/kit
  // meta the session adopter needs; hand them over before the key goes.
  if (version < 2) captureLegacyPresetMeta(state);

  const rawPresets =
    typeof state === "object" && state !== null
      ? (state as { customPresets?: unknown }).customPresets
      : undefined;
  const presets = Array.isArray(rawPresets) ? rawPresets : [];

  const adoptedRows: LibraryIndexRow[] = [];
  const adoptedIds = new Set<string>();

  for (const [index, entry] of presets.entries()) {
    const { id, name } = rawPresetMeta(entry);
    if (id !== undefined && adoptedIds.has(id)) continue;

    // Idempotent resume: an entry written by a previous interrupted run is
    // recognized by id and kept as-is, never rewritten or duplicated.
    if (id !== undefined && getItemSync(libraryEntryKey(id)) !== null) {
      adoptedIds.add(id);
      adoptedRows.push({ id, name: name ?? id });
      continue;
    }

    try {
      const document = migrateV1ToDocument(validatePresetFileV1(entry));
      putLibraryEntrySync(document);
      adoptedIds.add(document.meta.id);
      adoptedRows.push({ id: document.meta.id, name: document.meta.name });
    } catch (error) {
      if (error instanceof StorageFullError) {
        // Quota mid-adoption: stop here, keep the legacy key AND the
        // backup, keep what was written. Idempotency covers the retry.
        console.error(
          "Drumhaus library adoption: storage is full; stopping with the " +
            "legacy key intact and resuming on the next boot",
          error,
        );
        return;
      }

      // A corrupt entry quarantines to its own key and never blocks the
      // others. Best-effort: on failure the raw entry still lives in the
      // backup (and in the legacy key until adoption completes).
      const quarantineId = id ?? `entry-${index}`;
      try {
        putItemSync(libraryQuarantineKey(quarantineId), JSON.stringify(entry));
      } catch (quarantineError) {
        if (quarantineError instanceof StorageFullError) {
          console.error(
            "Drumhaus library adoption: storage is full; stopping with the " +
              "legacy key intact and resuming on the next boot",
            quarantineError,
          );
          return;
        }
        console.error(
          "Drumhaus library adoption: failed to quarantine corrupt entry " +
            `"${quarantineId}"`,
          quarantineError,
        );
      }
      console.error(
        `Drumhaus library adoption: legacy preset "${quarantineId}" failed ` +
          `to migrate and was quarantined to ` +
          `"${libraryQuarantineKey(quarantineId)}"`,
        error,
      );
    }
  }

  // The final index: adopted rows in the legacy array's order, preceded by
  // any rows an interrupted first run's saves created in the meantime.
  const preservedRows = readLibraryIndexSync().filter(
    (row) => !adoptedIds.has(row.id),
  );
  try {
    writeLibraryIndexSync([...preservedRows, ...adoptedRows]);
  } catch (error) {
    if (error instanceof StorageFullError) {
      console.error(
        "Drumhaus library adoption: storage is full writing the index; " +
          "stopping with the legacy key intact and resuming on the next boot",
        error,
      );
      return;
    }
    throw error;
  }

  // Every entry is written or quarantined and the index landed: the legacy
  // key retires. Deletion cannot fail for quota, so from here adoption is
  // complete and never runs again.
  removeItemSync(LEGACY_PRESET_META_STORAGE_KEY);
}

export { LIBRARY_BACKUP_KEY, adoptLegacyPresetLibrary };
