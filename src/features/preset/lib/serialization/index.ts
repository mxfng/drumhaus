import {
  InvalidFileError,
  migrateV1ToDocument,
  PRESET_FILE_VERSION,
  UnsupportedVersionError,
  validatePresetFileV1,
  type PresetDocument,
} from "@/features/preset/document";
import { decodeCompactDocument, encodeCompactDocument } from "./compact-v2";
import { compress, decompress } from "./compress";
import { decodePreset, validateCompactPreset } from "./decode";

/**
 * The share-URL codec: gzip + base64url over a compact JSON payload carried
 * in the `?p=` query param.
 *
 * Outbound links always encode the v2 preset document (compact-v2.ts).
 * Inbound payloads dispatch on their `v` field:
 * - 2: decoded directly to a PresetDocument.
 * - 1.5 (the #269 knob-space codec): decoded by the retained v1.5 path,
 *   which feeds the same validatePresetFileV1 + migrateV1ToDocument ladder
 *   as v1.x file imports, and lives until the v1.x file sunset.
 * - absent (pre-#269 legacy links): refused with UnsupportedVersionError
 *   (docs/preset-persistence.md, decision 4); the URL ingress surfaces the
 *   existing invalid-link toast and falls back to init().
 *
 * This module is imported dynamically by the share and URL-load paths to
 * keep pako out of the main bundle.
 */

/**
 * Converts a PresetDocument to a compressed URL-safe string
 *
 * @param document - The preset document to share
 * @returns Compressed URL-safe string suitable for URL query parameters
 * @throws {UnknownKitError} If the document's kit id is not in the registry
 */
function shareableDocumentToUrl(document: PresetDocument): string {
  // Chain: PresetDocument -> CompactPresetV2 -> JSON -> compressed base64url
  const compact = encodeCompactDocument(document);
  return compress(JSON.stringify(compact));
}

/**
 * Converts a compressed URL parameter back to a PresetDocument
 *
 * @param urlParam - The compressed URL-safe string from the ?p= query parameter
 * @returns Validated preset document ready for applyPresetDocument
 * @throws {InvalidFileError} If the payload cannot be decompressed or parsed
 * @throws {UnsupportedVersionError} If the payload's codec version is not
 * 1.5 or 2 (notably pre-#269 versionless links, decision 4)
 * @throws {CorruptFieldError} If a v2 payload fails shape/range validation
 * @throws {UnknownKitError} If the kit reference does not resolve
 */
function urlToDocument(urlParam: string): PresetDocument {
  let json: string;
  try {
    json = decompress(urlParam);
  } catch {
    throw new InvalidFileError(
      "Shared preset link is corrupted: could not decompress payload",
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new InvalidFileError(
      "Shared preset link is corrupted: payload is not valid JSON",
    );
  }

  if (typeof data !== "object" || data === null) {
    throw new InvalidFileError("Shared preset payload must be an object");
  }

  const version = (data as Record<string, unknown>).v;

  if (version === 2) {
    return decodeCompactDocument(data);
  }

  if (version === PRESET_FILE_VERSION) {
    // The v1.5 knob-space path: compact -> PresetFileV1, then the same
    // validate -> migrate rung every v1.x file ingress uses.
    validateCompactPreset(data);
    const preset = decodePreset(data);
    return migrateV1ToDocument(validatePresetFileV1(preset));
  }

  // Versionless pre-#269 links land here and are deliberately refused.
  throw new UnsupportedVersionError(version);
}

export { shareableDocumentToUrl, urlToDocument };
