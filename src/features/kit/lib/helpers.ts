import { KitFile } from "../types/kit";

/**
 * Validates a parsed kit file object.
 *
 * The registry is bundled-only and canonical (no version series), so the check
 * is only structural: the shape is trusted because it ships with the app.
 */
function validateKitFile(data: unknown): KitFile {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid kit file: expected an object");
  }

  const kit = data as Record<string, unknown>;

  if (kit.kind !== "drumhaus.kit") {
    throw new Error("Invalid kit file type");
  }

  return kit as unknown as KitFile;
}

export { validateKitFile };
