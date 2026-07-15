/**
 * Typed error taxonomy for preset document parsing.
 *
 * This taxonomy will grow in later PRs (e.g. UnknownKitError for share-URL
 * kit references, StorageFullError for library saves).
 */

type PresetDocumentErrorCode =
  | "invalid-file"
  | "unsupported-version"
  | "corrupt-field";

/**
 * Base class for all errors raised while parsing a preset document.
 */
abstract class PresetDocumentError extends Error {
  abstract readonly code: PresetDocumentErrorCode;
}

/**
 * The input is not a preset file at all: not JSON, not an object,
 * or the wrong kind.
 */
class InvalidFileError extends PresetDocumentError {
  readonly code = "invalid-file";

  constructor(message: string) {
    super(message);
    this.name = "InvalidFileError";
  }
}

/**
 * The file is a preset, but its version is not one this build can read.
 */
class UnsupportedVersionError extends PresetDocumentError {
  readonly code = "unsupported-version";
  readonly version: unknown;

  constructor(version: unknown) {
    super(`Unsupported preset version: ${String(version)}`);
    this.name = "UnsupportedVersionError";
    this.version = version;
  }
}

/**
 * The envelope is a valid v1 preset, but a field inside it is corrupt.
 * Carries the dot path of the offending field (e.g. "sequencer.pattern.voices").
 */
class CorruptFieldError extends PresetDocumentError {
  readonly code = "corrupt-field";
  readonly path: string;

  constructor(path: string, message: string) {
    super(`Corrupt preset field "${path}": ${message}`);
    this.name = "CorruptFieldError";
    this.path = path;
  }
}

export {
  PresetDocumentError,
  InvalidFileError,
  UnsupportedVersionError,
  CorruptFieldError,
};
export type { PresetDocumentErrorCode };
