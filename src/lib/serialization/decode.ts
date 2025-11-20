import type { KitFileV1 } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";
import { decodeCompactPreset, type CompactPreset } from "./compact";
import { getDefaultKitLoader } from "./defaultKits";

/**
 * Error thrown when a kit ID is not found in the default kit registry
 */
export class UnknownKitError extends Error {
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
export class InvalidPresetError extends Error {
  constructor(message: string) {
    super(`Invalid preset data: ${message}`);
    this.name = "InvalidPresetError";
  }
}

/**
 * Loads a default kit by ID from the registry
 */
function loadDefaultKit(kitId: string): KitFileV1 {
  const loader = getDefaultKitLoader(kitId);
  if (!loader) {
    throw new UnknownKitError(kitId);
  }
  return loader();
}

/**
 * Validates a CompactPreset structure
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
 * Deserializes a JSON string to a CompactPreset with validation
 */
export function deserializePreset(jsonString: string): CompactPreset {
  try {
    const data = JSON.parse(jsonString);
    validateCompactPreset(data);
    return data;
  } catch (error) {
    if (error instanceof InvalidPresetError || error instanceof SyntaxError) {
      throw error;
    }
    throw new InvalidPresetError(
      error instanceof Error ? error.message : "Unknown parsing error",
    );
  }
}

/**
 * Converts a CompactPreset to a full PresetFileV1
 * Rehydrates kit data from the default kit registry
 */
export function decodePreset(compactPreset: CompactPreset): PresetFileV1 {
  return decodeCompactPreset(compactPreset, loadDefaultKit);
}
