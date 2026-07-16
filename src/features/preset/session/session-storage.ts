/**
 * The one localStorage key holding the working session
 * (docs/preset-persistence.md, "Session storage: the document replaces five
 * persists"): a versioned envelope carrying the current preset document
 * plus the clean-content hash for reload-stable dirty tracking.
 *
 * Reads parse only the envelope shell strictly, then route the inner
 * document through decodePresetObject, the same version-dispatching ladder
 * every other document ingress uses, so a v2-era session migrates instead of
 * quarantining and a corrupt session fails typed instead of partially
 * rehydrating. All storage access is guarded like recovery-stats.ts:
 * private-browsing/storage-denied modes degrade to a no-op rather than
 * break boot or autosave.
 */

import { z } from "zod";

import {
  CorruptFieldError,
  decodePresetObject,
  InvalidFileError,
  PresetDocumentError,
  type PresetDocument,
} from "@/features/preset/document";

const SESSION_STORAGE_KEY = "drumhaus-session";
/**
 * Where a corrupt session payload is preserved verbatim (never destroy user
 * data); boot falls back to init but the bytes stay recoverable.
 */
const SESSION_QUARANTINE_KEY = "drumhaus-session-quarantine";
const SESSION_ENVELOPE_VERSION = 1;

/**
 * The envelope SHELL only: `v`, `cleanHash`, and an opaque `document`. The
 * document is left as `z.unknown()` here so it can be routed through the
 * version-dispatching ladder (decodePresetObject) rather than pinned to the
 * strict current-version schema, which would orphan v2-era and future-version
 * documents.
 */
const sessionEnvelopeShellSchema = z.object({
  v: z.literal(SESSION_ENVELOPE_VERSION),
  document: z.unknown(),
  // null only if the session was written before any clean baseline existed;
  // restoring null keeps hasUnsavedChanges() quiet, like today.
  cleanHash: z.string().nullable(),
});

interface SessionEnvelope {
  v: typeof SESSION_ENVELOPE_VERSION;
  document: PresetDocument;
  cleanHash: string | null;
}

type SessionReadResult =
  | { status: "missing" }
  | { status: "ok"; raw: string; envelope: SessionEnvelope }
  | { status: "corrupt"; raw: string; error: PresetDocumentError };

/**
 * Read and decode the session envelope. Storage denial reads as missing;
 * unparseable or schema-violating payloads read as corrupt with a typed
 * error and the raw payload for quarantining.
 */
function readSessionEnvelope(): SessionReadResult {
  let raw: string | null;
  try {
    raw = globalThis.localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return { status: "missing" };
  }
  if (raw === null) return { status: "missing" };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      status: "corrupt",
      raw,
      error: new InvalidFileError("Session storage is not valid JSON"),
    };
  }

  const shell = sessionEnvelopeShellSchema.safeParse(data);
  if (!shell.success) {
    const issue = shell.error.issues[0];
    return {
      status: "corrupt",
      raw,
      error: new CorruptFieldError(issue.path.join("."), issue.message),
    };
  }

  // Route the inner document through the version-dispatching ladder, so a
  // v2-era (or any future readable) document migrates rather than reads as
  // corrupt. A genuinely bad document surfaces as a typed error to quarantine.
  let document: PresetDocument;
  try {
    document = decodePresetObject(shell.data.document);
  } catch (error) {
    if (error instanceof PresetDocumentError) {
      return { status: "corrupt", raw, error };
    }
    throw error;
  }

  return {
    status: "ok",
    raw,
    envelope: { v: shell.data.v, document, cleanHash: shell.data.cleanHash },
  };
}

/**
 * Serialize the envelope minified and write it. Returns false when storage
 * is unavailable or full; callers decide whether that warrants a warning
 * (autosave) or keeping legacy keys alive (the adopter).
 */
function writeSessionEnvelope(
  document: PresetDocument,
  cleanHash: string | null,
): boolean {
  const envelope: SessionEnvelope = {
    v: SESSION_ENVELOPE_VERSION,
    document,
    cleanHash,
  };
  try {
    globalThis.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(envelope),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Move a corrupt session payload to the quarantine key. The session key is
 * only removed after the quarantine copy is safely written, so a quota
 * failure never destroys the payload.
 */
function quarantineSessionPayload(raw: string): void {
  try {
    globalThis.localStorage.setItem(SESSION_QUARANTINE_KEY, raw);
    globalThis.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Quarantine is best-effort; leaving the corrupt payload in place just
    // means the next boot quarantines again.
  }
}

export {
  SESSION_QUARANTINE_KEY,
  SESSION_STORAGE_KEY,
  quarantineSessionPayload,
  readSessionEnvelope,
  writeSessionEnvelope,
};
export type { SessionEnvelope, SessionReadResult };
