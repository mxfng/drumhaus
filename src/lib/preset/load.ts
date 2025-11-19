import { PresetFileV1 } from "@/types/preset";

/**
 * Validates a parsed preset file object
 */
export function validatePresetFile(data: unknown): PresetFileV1 {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid preset file: expected an object");
  }

  const preset = data as Record<string, unknown>;

  if (preset.kind !== "drumhaus.preset") {
    throw new Error("Invalid preset file type");
  }
  if (preset.version !== 1) {
    throw new Error(`Unsupported preset version: ${preset.version}`);
  }

  // TODO: optional: deep validation, zod, etc.

  return preset as unknown as PresetFileV1;
}

/**
 * Parses a preset file from a JSON string
 */
export function parsePresetFile(dh: string): PresetFileV1 {
  const data = JSON.parse(dh);
  return validatePresetFile(data);
}
