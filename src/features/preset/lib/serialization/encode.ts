import type { PresetFileV1 } from "@/features/preset/types/preset";
import { encodeCompactPreset, type CompactPreset } from "./compact";

/**
 * Error thrown when trying to share a preset with a custom kit
 * Custom kits cannot be shared via URL because they require custom sample files
 */
export class CustomKitError extends Error {
  constructor() {
    super(
      "Cannot share presets with custom kits. Only presets using default kits can be shared via URL.",
    );
    this.name = "CustomKitError";
  }
}

/**
 * Checks if a kit ID represents a default kit
 * Default kits have IDs starting with "kit-"
 */
export function isDefaultKit(kitId: string): boolean {
  return kitId.startsWith("kit-");
}

/**
 * Converts a full PresetFileV1 to ultra-compact format
 * Throws CustomKitError if the preset uses a custom kit
 *
 * Optimizations applied:
 * - Bit-packed triggers (16 bools → 4 hex chars)
 * - Quantized velocities (floats → ints 0-100)
 * - Single-letter keys
 * - Kit ID as single digit
 * - Omit default values
 */
export function encodePreset(preset: PresetFileV1): CompactPreset {
  const kitId = preset.kit.meta.id;

  // Validate that this is a default kit
  if (!isDefaultKit(kitId)) {
    throw new CustomKitError();
  }

  return encodeCompactPreset(preset);
}

/**
 * Serializes a CompactPreset to a minified JSON string
 */
export function serializePreset(preset: CompactPreset): string {
  // Minify JSON (no whitespace)
  return JSON.stringify(preset);
}
