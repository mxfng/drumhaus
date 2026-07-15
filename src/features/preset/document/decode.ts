/**
 * Decode raw `.dh` file text into the canonical v2 preset document.
 *
 * The dual-read entry point: version 1 flows through the legacy parse path
 * and the 1-to-2 migration, version 2 parses strictly against the document
 * schema, and any other version is hard-refused (decision 2).
 */

import {
  PRESET_DOCUMENT_KIND,
  PRESET_DOCUMENT_VERSION,
  presetDocumentSchema,
  type PresetDocument,
} from "./document";
import {
  CorruptFieldError,
  InvalidFileError,
  UnsupportedVersionError,
} from "./errors";
import { migrateV1ToDocument } from "./migrate-v1";
import { validatePresetFileV1 } from "./parse";

/**
 * Parse preset file text of any supported version into a PresetDocument.
 *
 * @throws {InvalidFileError} If the text is not JSON or not a preset file
 * @throws {UnsupportedVersionError} If the version is neither 1 nor 2
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

  if (typeof data !== "object" || data === null) {
    throw new InvalidFileError("Invalid preset file: expected an object");
  }

  const raw = data as Record<string, unknown>;
  if (raw.kind !== PRESET_DOCUMENT_KIND) {
    throw new InvalidFileError("Invalid preset file type");
  }

  if (raw.version === 1) {
    return migrateV1ToDocument(validatePresetFileV1(raw));
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

export { decodePresetFileText };
