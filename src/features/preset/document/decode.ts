import {
  PRESET_DOCUMENT_KIND,
  PRESET_DOCUMENT_VERSION,
  presetDocumentSchema,
  type PresetDocument,
} from "./document";
import {
  CorruptFieldError,
  InvalidFileError,
  PresetDocumentError,
  UnsupportedVersionError,
} from "./errors";
import { isReadablePresetFileVersion } from "./migrate";
import { migrateV1ToDocument } from "./migrate-v1";
import { migrateV2ToDocument } from "./migrate-v2";
import { validatePresetFileV1 } from "./parse";

/**
 * Decode raw `.dh` file text into the current (v2.1) preset document.
 *
 * The multi-version read entry point: versions 1 and 1.5 flow through the
 * frozen legacy parse path (which normalizes 1 to 1.5 knob space, #269) and
 * the 1-to-2.1 migration; version 2 (the short-lived domain document whose
 * split filter was still a 0-100 position) is migrated to v2.1 (split filter
 * -> canonical `{ side, cutoffHz }`); version 2.1 parses strictly against the
 * document schema; any other version is hard-refused (decision 2). The version
 * is dispatched on BEFORE the strict parse, so a v2 filter-as-number is always
 * routed through its migration and can never be mis-read as a v2.1 canonical
 * filter.
 */

/** The v2 domain document, whose split filter was still a 0-100 position. */
const PRESET_DOCUMENT_VERSION_V2 = 2;

/**
 * Parse preset file text of any supported version into a PresetDocument.
 *
 * @throws {InvalidFileError} If the text is not JSON or not a preset file
 * @throws {UnsupportedVersionError} If the version is not 1, 1.5, 2, or 2.1
 * @throws {CorruptFieldError} If a field inside the envelope is corrupt
 * @throws {UnknownKitError} If a v1 file's kit id does not resolve in the
 * registry
 */
function decodePresetFileText(text: string): PresetDocument {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new InvalidFileError("Invalid preset file: not valid JSON");
  }
  return decodePresetObject(data);
}

/**
 * Decode an already-parsed preset value of any supported version into the
 * current (v2.1) document. The version dispatch shared by file reads and the
 * legacy-library adoption; the only difference from decodePresetFileText is
 * that the caller has already done JSON.parse.
 *
 * @throws {InvalidFileError} If the value is not an object or not a preset
 * @throws {UnsupportedVersionError} If the version is not 1, 1.5, 2, or 2.1
 * @throws {CorruptFieldError} If a field inside the envelope is corrupt
 */
function decodePresetObject(data: unknown): PresetDocument {
  if (typeof data !== "object" || data === null) {
    throw new InvalidFileError("Invalid preset file: expected an object");
  }

  const raw = data as Record<string, unknown>;
  if (raw.kind !== PRESET_DOCUMENT_KIND) {
    throw new InvalidFileError("Invalid preset file type");
  }

  if (isReadablePresetFileVersion(raw.version)) {
    return migrateV1ToDocument(validatePresetFileV1(raw));
  }

  if (raw.version === PRESET_DOCUMENT_VERSION_V2) {
    return migrateV2ToDocument(raw);
  }

  if (raw.version === PRESET_DOCUMENT_VERSION) {
    const result = presetDocumentSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      throw new CorruptFieldError(issue.path.join("."), issue.message);
    }
    return result.data;
  }

  throw new UnsupportedVersionError(raw.version);
}

/**
 * The non-throwing decode result for stored-document readers (the session
 * envelope and library entries), whose corrupt-handling is quarantine, not a
 * user-facing toast: a readable document decodes (migrating if it is an older
 * readable version), and any document-level failure comes back as a typed
 * error for the caller to quarantine.
 */
type StoredDocumentDecodeResult =
  | { status: "ok"; document: PresetDocument }
  | { status: "corrupt"; error: PresetDocumentError };

/**
 * Decode an already-parsed stored value through the version-dispatching
 * ladder without throwing on document-level failures. Non-document errors
 * (real bugs) still propagate.
 */
function decodeStoredPresetObject(data: unknown): StoredDocumentDecodeResult {
  try {
    return { status: "ok", document: decodePresetObject(data) };
  } catch (error) {
    if (error instanceof PresetDocumentError) {
      return { status: "corrupt", error };
    }
    throw error;
  }
}

/**
 * Decode stored JSON text through the version-dispatching ladder without
 * throwing on document-level failures; not-JSON reads as a typed corrupt
 * result like any other unreadable payload.
 */
function decodeStoredPresetText(raw: string): StoredDocumentDecodeResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      status: "corrupt",
      error: new InvalidFileError("Stored preset is not valid JSON"),
    };
  }
  return decodeStoredPresetObject(data);
}

export {
  decodePresetFileText,
  decodePresetObject,
  decodeStoredPresetObject,
  decodeStoredPresetText,
};
export type { StoredDocumentDecodeResult };
