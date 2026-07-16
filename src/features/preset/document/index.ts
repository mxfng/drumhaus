// apply.ts and snapshot.ts are deliberately NOT re-exported here: both pull
// in the Zustand stores, whose import graph reaches @/core/dh, which imports
// this barrel. Surfacing them here would create an import cycle crossing
// module-scope side effects (the preset-meta store calls init() at module
// evaluation). Import them directly from
// "@/features/preset/document/apply" and "@/features/preset/document/snapshot".
export {
  PRESET_DOCUMENT_KIND,
  PRESET_DOCUMENT_VERSION,
  presetDocumentSchema,
} from "./document";
export type { PresetDocument } from "./document";
export { decodePresetFileText, decodePresetObject } from "./decode";
export { encodePresetDocument } from "./encode";
export {
  CorruptFieldError,
  InvalidFileError,
  PresetDocumentError,
  StorageFullError,
  UnknownKitError,
  UnsupportedVersionError,
} from "./errors";
export type { PresetDocumentErrorCode } from "./errors";
export { presetFileV1Schema } from "./file-v1";
export {
  PRESET_FILE_VERSION,
  isReadablePresetFileVersion,
  migratePresetFileVersion,
} from "./migrate";
export { migrateV1ToDocument } from "./migrate-v1";
export { parsePresetFileV1, validatePresetFileV1 } from "./parse";
