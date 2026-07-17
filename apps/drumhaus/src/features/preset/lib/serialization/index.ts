import {
  InvalidFileError,
  UnsupportedVersionError,
  type PresetDocument,
} from "@/features/preset/document";
import {
  COMPACT_CODEC_VERSION,
  decodeCompactDocument,
  encodeCompactDocument,
} from "./compact";
import { compress, decompress } from "./compress";

/**
 * The share-URL codec: gzip + base64url over a compact JSON payload carried
 * in the `?p=` query param.
 *
 * There is exactly ONE share codec (compact.ts). Outbound links always encode
 * the current canonical PresetDocument. Inbound links are read latest-only:
 * a payload whose `v` equals the current COMPACT_CODEC_VERSION is decoded to a
 * PresetDocument; every other `v` is refused with UnsupportedVersionError.
 * That refusal covers older v1.5 knob-space links and pre-#269 versionless
 * links alike (#373); the share codec no longer carries a legacy decoder, so
 * pre-#269 links stop resolving. Saved `.dh` files and library kits are
 * UNAFFECTED - they still migrate v1/v1.5/v2 through the document ladder.
 *
 * A refused or corrupt link surfaces the existing invalid-link toast and the
 * URL ingress falls back to init(), never a crash.
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
  // Chain: PresetDocument -> CompactPreset -> JSON -> compressed base64url
  const compact = encodeCompactDocument(document);
  return compress(JSON.stringify(compact));
}

/**
 * Converts a compressed URL parameter back to a PresetDocument
 *
 * @param urlParam - The compressed URL-safe string from the ?p= query parameter
 * @returns Validated preset document ready for applyPresetDocument
 * @throws {InvalidFileError} If the payload cannot be decompressed or parsed
 * @throws {UnsupportedVersionError} If the payload's codec version is not the
 * single current COMPACT_CODEC_VERSION (older v1.5 links and pre-#269
 * versionless links are refused, #373)
 * @throws {CorruptFieldError} If a current-version payload fails shape/range
 * validation
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

  // Latest-only: only the single current codec version decodes. Everything
  // else - older v1.5 links and versionless pre-#269 links - is refused here.
  if (version !== COMPACT_CODEC_VERSION) {
    throw new UnsupportedVersionError(version);
  }

  return decodeCompactDocument(data);
}

export { shareableDocumentToUrl, urlToDocument };
