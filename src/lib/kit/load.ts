import { KitFileV1 } from "@/types/instrument";

/**
 * Validates a parsed kit file object
 */
export function validateKitFile(data: unknown): KitFileV1 {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid kit file: expected an object");
  }

  const kit = data as Record<string, unknown>;

  if (kit.kind !== "drumhaus.kit") {
    throw new Error("Invalid kit file type");
  }
  if (kit.version !== 1) {
    throw new Error(`Unsupported kit version: ${kit.version}`);
  }

  // TODO: optional: deep validation, zod, etc.

  return kit as unknown as KitFileV1;
}

/**
 * Parses a kit file from a JSON string
 */
export function parseKitFile(dhkit: string): KitFileV1 {
  const data = JSON.parse(dhkit);
  return validateKitFile(data);
}
