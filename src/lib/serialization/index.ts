import type { PresetFileV1 } from "@/types/preset";
import { compress, decompress } from "./compress";
import {
  decodePreset,
  deserializePreset,
  InvalidPresetError,
  UnknownKitError,
} from "./decode";
import { CustomKitError, encodePreset, serializePreset } from "./encode";

// Re-export error types for consumers
export { CustomKitError, UnknownKitError, InvalidPresetError };

/**
 * Converts a PresetFileV1 to a compressed URL-safe string
 *
 * @param preset - The full preset to share
 * @returns Compressed URL-safe string suitable for URL query parameters
 * @throws {CustomKitError} If the preset uses a custom kit (not shareable)
 *
 * @example
 * ```typescript
 * const preset = getCurrentPreset();
 * try {
 *   const urlParam = shareablePresetToUrl(preset);
 *   const shareUrl = `${window.location.origin}/?p=${urlParam}`;
 *   navigator.clipboard.writeText(shareUrl);
 * } catch (error) {
 *   if (error instanceof CustomKitError) {
 *     alert("Cannot share presets with custom kits");
 *   }
 * }
 * ```
 */
export function shareablePresetToUrl(preset: PresetFileV1): string {
  // Chain: PresetFileV1 -> ShareablePreset -> JSON -> Compressed -> URL-safe base64
  const shareablePreset = encodePreset(preset);
  const jsonString = serializePreset(shareablePreset);
  const compressed = compress(jsonString);
  return compressed;
}

/**
 * Converts a compressed URL parameter back to a PresetFileV1
 *
 * @param urlParam - The compressed URL-safe string from the ?p= query parameter
 * @returns Full PresetFileV1 object ready to load into stores
 * @throws {InvalidPresetError} If the data is corrupted or malformed
 * @throws {UnknownKitError} If the kit ID is not found in the registry
 *
 * @example
 * ```typescript
 * const urlParams = new URLSearchParams(window.location.search);
 * const presetParam = urlParams.get('p');
 *
 * if (presetParam) {
 *   try {
 *     const preset = urlToPreset(presetParam);
 *     updateStatesOnPresetChange(preset);
 *   } catch (error) {
 *     if (error instanceof UnknownKitError) {
 *       alert("This preset uses a kit that is not available");
 *     } else if (error instanceof InvalidPresetError) {
 *       alert("The shared preset link is corrupted or invalid");
 *     }
 *   }
 * }
 * ```
 */
export function urlToPreset(urlParam: string): PresetFileV1 {
  // Chain: URL-safe base64 -> Decompressed -> JSON -> ShareablePreset -> PresetFileV1
  const jsonString = decompress(urlParam);
  const shareablePreset = deserializePreset(jsonString);
  const preset = decodePreset(shareablePreset);
  return preset;
}
