/**
 * Typed error taxonomy for preset document parsing.
 *
 * This taxonomy will grow in later PRs (e.g. StorageFullError for library
 * saves).
 */

type PresetDocumentErrorCode =
  | "invalid-file"
  | "unsupported-version"
  | "corrupt-field"
  | "unknown-kit";

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
    super(
      `This preset uses file format version ${String(version)}, which this ` +
        "version of Drumhaus cannot read. The app may be older than the " +
        "file; try updating.",
    );
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

/**
 * The preset references a kit id the registry cannot resolve (decision 12:
 * fail typed rather than silently substitute sounds). `kitId` is undefined
 * when the preset carries no usable kit id at all.
 */
class UnknownKitError extends PresetDocumentError {
  readonly code = "unknown-kit";
  readonly kitId: string | undefined;

  constructor(kitId: string | undefined) {
    super(
      kitId === undefined
        ? "This preset does not reference a kit, so its sounds cannot be loaded."
        : `This preset uses the kit "${kitId}", which this build of Drumhaus does not include.`,
    );
    this.name = "UnknownKitError";
    this.kitId = kitId;
  }
}

export {
  PresetDocumentError,
  InvalidFileError,
  UnsupportedVersionError,
  CorruptFieldError,
  UnknownKitError,
};
export type { PresetDocumentErrorCode };
