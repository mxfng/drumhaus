import { KitFileV1 } from "../types/kit";

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

  return kit as unknown as KitFileV1;
}
