import { KitFile } from "../types/kit";
import { kitFileSchema } from "./schema";

/**
 * Validates a parsed kit file object against the strict registry schema.
 *
 * The registry is bundled-only and canonical (no version series), so a kit is
 * either the one right shape or a ship-time bug. Parsing here gives the
 * `.dhkit` files the same load-time schema enforcement the factory `.dh`
 * defaults get (core/dh/index.ts): a malformed kit throws a typed ZodError at
 * registry load rather than casting past the gate.
 *
 * @throws {z.ZodError} If the value is not a valid kit file.
 */
function validateKitFile(data: unknown): KitFile {
  return kitFileSchema.parse(data);
}

export { validateKitFile };
