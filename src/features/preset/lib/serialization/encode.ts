import type { PresetFileV1 } from "@/features/preset/types/preset";
import { encodeCompactPreset, type CompactPreset } from "./compact";

/**
 * Error thrown when trying to share a preset with a custom kit
 * Custom kits cannot be shared via URL because they require custom sample files
 */
class CustomKitError extends Error {
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
function isDefaultKit(kitId: string): boolean {
  return kitId.startsWith("kit-");
}

/**
 * Converts a full PresetFileV1 to the v1.5 compact format.
 * Throws CustomKitError if the preset uses a custom kit.
 *
 * The live share path writes v2 payloads (compact-v2.ts); this encoder is
 * retained to exercise the v1.5 decoder in tests until the v1.x sunset.
 */
function encodePreset(preset: PresetFileV1): CompactPreset {
  const kitId = preset.kit.meta.id;

  // Validate that this is a default kit
  if (!isDefaultKit(kitId)) {
    throw new CustomKitError();
  }

  return encodeCompactPreset(preset);
}

export { CustomKitError, isDefaultKit, encodePreset };
