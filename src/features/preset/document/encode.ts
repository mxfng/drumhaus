/**
 * Encode a preset document as `.dh` file text: pretty-printed 2-space JSON
 * (docs/preset-persistence.md, Format assessment: at a few kilobytes,
 * human-readable and diffable is a feature).
 */

import { presetDocumentSchema, type PresetDocument } from "./document";

/**
 * Serialize a preset document to `.dh` file text. The document is re-parsed
 * through the schema first, so an out-of-range value fails loudly at encode
 * time instead of producing a file this build would refuse to read back.
 *
 * @throws {z.ZodError} If the document violates presetDocumentSchema
 */
function encodePresetDocument(document: PresetDocument): string {
  return JSON.stringify(presetDocumentSchema.parse(document), null, 2);
}

export { encodePresetDocument };
