/**
 * The egress half of the preset pipeline: snapshot the live stores as a v2
 * preset document (docs/preset-persistence.md, "The pipeline and its two
 * halves": every egress is snapshot() -> encode).
 *
 * DELIBERATE DEVIATION from the design doc's PR 3 line ("replace
 * getCurrentPreset with snapshot() everywhere"): save, share, and dirty
 * detection keep reading the stores in knob space via getCurrentPreset()
 * until PR 5 lands document-hash dirty tracking. Deriving those paths
 * through knob -> domain -> knob would introduce float noise into the
 * JSON-equality dirty comparison in hasUnsavedChanges(). Only the .dh
 * export egress flows through here for now.
 *
 * Deliberately not exported from the document barrel (see index.ts): this
 * module reads the stores via lib/helpers, whose import graph reaches back
 * into the barrel.
 */

import { getCurrentPreset } from "@/features/preset/lib/helpers";
import type { Meta } from "@/features/preset/types/meta";
import type { PresetDocument } from "./document";
import { migrateV1ToDocument } from "./migrate-v1";

/**
 * Snapshot the current store state as a preset document: the knob-space
 * cross-store read (getCurrentPreset) crossed to domain units once, via the
 * same migration every other ingress uses.
 *
 * @param presetMeta - Identity for the snapshot (minted fresh by exports)
 * @param kitMeta - The current kit's metadata; its id must resolve in the
 * registry
 */
function snapshotPresetDocument(
  presetMeta: Meta,
  kitMeta: Meta,
): PresetDocument {
  return migrateV1ToDocument(getCurrentPreset(presetMeta, kitMeta));
}

export { snapshotPresetDocument };
