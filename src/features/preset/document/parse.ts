import type { PresetFileV1 } from "@/features/preset/types/preset";
import {
  CorruptFieldError,
  InvalidFileError,
  UnsupportedVersionError,
} from "./errors";
import { collectStrippedKeyPaths, presetFileV1Schema } from "./file-v1";
import {
  isReadablePresetFileVersion,
  migratePresetFileVersion,
} from "./migrate";

/**
 * Parse and validate a preset from raw file text.
 *
 * @throws {InvalidFileError} If the text is not JSON or not a preset file
 * @throws {UnsupportedVersionError} If the preset version is not 1 or 1.5
 * @throws {CorruptFieldError} If a field inside the envelope is corrupt
 */
function parsePresetFileV1(text: string): PresetFileV1 {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new InvalidFileError("Invalid preset file: not valid JSON");
  }
  return validatePresetFileV1(data);
}

/**
 * Validate an already-parsed value as a knob-space (v1-family) preset file
 * and normalize it to the current version (v1.5): version-1 files get the
 * #269 swing knob migration applied (see migratePresetFileVersion).
 *
 * Unknown keys at the envelope and section level are stripped from the
 * returned value and reported once via console.warn.
 *
 * @throws {InvalidFileError} If the value is not an object or the wrong kind
 * @throws {UnsupportedVersionError} If the preset version is not 1 or 1.5
 * @throws {CorruptFieldError} If a field inside the envelope is corrupt
 */
function validatePresetFileV1(data: unknown): PresetFileV1 {
  if (typeof data !== "object" || data === null) {
    throw new InvalidFileError("Invalid preset file: expected an object");
  }

  const raw = data as Record<string, unknown>;

  if (raw.kind !== "drumhaus.preset") {
    throw new InvalidFileError("Invalid preset file type");
  }
  if (!isReadablePresetFileVersion(raw.version)) {
    throw new UnsupportedVersionError(raw.version);
  }

  const result = presetFileV1Schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new CorruptFieldError(issue.path.join("."), issue.message);
  }

  const strippedPaths = collectStrippedKeyPaths(raw);
  if (strippedPaths.length > 0) {
    console.warn(
      `Preset file contains unknown fields (stripped): ${strippedPaths.join(", ")}`,
    );
  }

  // The schema is intentionally looser than the compile-time type; the
  // migrators invoked by loadPreset normalize the remaining legacy variance.
  return migratePresetFileVersion(result.data as unknown as PresetFileV1);
}

export { parsePresetFileV1, validatePresetFileV1 };
