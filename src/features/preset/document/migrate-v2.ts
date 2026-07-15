/**
 * The version-2 -> version-2.1 document migration.
 *
 * Version 2 was the first domain document, but it still persisted the split
 * filter as its 0-100 position. Version 2.1 refines it so the filter is
 * canonical `{ side, cutoffHz }` (docs/data-representation.md, Principle P2);
 * every other field is unchanged, so this migration rewrites only the eight
 * channel filters and the master filter, converting each position with the
 * FROZEN split-filter curve (frozen-split-filter.ts), then re-validates the
 * whole document against the strict v2.1 schema.
 *
 * This is a legacy-read concern: v2 documents live in saved sessions, the
 * preset library, and shared/exported `.dh` files, and must keep loading
 * forever.
 */

import {
  PRESET_DOCUMENT_VERSION,
  presetDocumentSchema,
  type PresetDocument,
} from "./document";
import { CorruptFieldError } from "./errors";
import { frozenSplitFilterPositionToCanonical } from "./frozen-split-filter";

/** Reads a required 0-100 filter position from a raw v2 field. */
function readFilterPosition(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CorruptFieldError(path, "expected a numeric filter position");
  }
  return value;
}

/**
 * Migrate a version-2 preset document to version 2.1. The input is a raw,
 * already-JSON-parsed object whose `version` is 2.
 *
 * @throws {CorruptFieldError} If a filter field is missing/non-numeric or the
 * migrated document fails the strict v2.1 schema
 */
function migrateV2ToDocument(raw: unknown): PresetDocument {
  if (typeof raw !== "object" || raw === null) {
    throw new CorruptFieldError("", "expected a preset document object");
  }
  const doc = raw as Record<string, unknown>;

  const rawChannels = Array.isArray(doc.channels) ? doc.channels : [];
  const channels = rawChannels.map((channel, index) => {
    const ch = (channel ?? {}) as Record<string, unknown>;
    return {
      ...ch,
      filter: frozenSplitFilterPositionToCanonical(
        readFilterPosition(ch.filter, `channels.${index}.filter`),
      ),
    };
  });

  const rawMaster = (doc.master ?? {}) as Record<string, unknown>;
  const master = {
    ...rawMaster,
    filter: frozenSplitFilterPositionToCanonical(
      readFilterPosition(rawMaster.filter, "master.filter"),
    ),
  };

  const candidate = {
    ...doc,
    version: PRESET_DOCUMENT_VERSION,
    channels,
    master,
  };

  const result = presetDocumentSchema.safeParse(candidate);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new CorruptFieldError(issue.path.join("."), issue.message);
  }
  return result.data;
}

export { migrateV2ToDocument };
