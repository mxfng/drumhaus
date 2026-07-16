import { KitFile } from "@/features/kit/types/kit";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { decodeCompactPreset, type CompactPreset } from "./compact";
import { getDefaultKitLoader } from "./default-kits";

/**
 * Error thrown when a kit ID is not found in the default kit registry
 */
class UnknownKitError extends Error {
  constructor(kitId: string) {
    super(
      `Unknown kit ID: "${kitId}". This kit may not exist or may be from a newer version of Drumhaus.`,
    );
    this.name = "UnknownKitError";
  }
}

/**
 * Error thrown when the shareable preset structure is invalid
 */
class InvalidPresetError extends Error {
  constructor(message: string) {
    super(`Invalid preset data: ${message}`);
    this.name = "InvalidPresetError";
  }
}

/**
 * Loads a default kit by ID from the registry
 */
function loadDefaultKit(kitId: string): KitFile {
  const loader = getDefaultKitLoader(kitId);
  if (!loader) {
    throw new UnknownKitError(kitId);
  }
  return loader();
}

/**
 * Validates a v1.5 CompactPreset structure
 */
function validateCompactPreset(data: unknown): asserts data is CompactPreset {
  if (typeof data !== "object" || data === null) {
    throw new InvalidPresetError("Preset must be an object");
  }

  const preset = data as Record<string, unknown>;

  // Basic structure validation
  if (!preset.k || typeof preset.k !== "string") {
    throw new InvalidPresetError("Missing or invalid kit ID (k)");
  }
  if (!preset.ip || !Array.isArray(preset.ip)) {
    throw new InvalidPresetError("Missing or invalid instrument params (ip)");
  }
  if (!preset.pt || !Array.isArray(preset.pt)) {
    throw new InvalidPresetError("Missing or invalid pattern (pt)");
  }
}

/**
 * Converts a CompactPreset to a full PresetFileV1
 * Rehydrates kit data from the default kit registry
 */
function decodePreset(compactPreset: CompactPreset): PresetFileV1 {
  return decodeCompactPreset(compactPreset, loadDefaultKit);
}

export {
  UnknownKitError,
  InvalidPresetError,
  validateCompactPreset,
  decodePreset,
};
