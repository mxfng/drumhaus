/**
 * Legacy-read island: the 0-100 knob-space shapes of the v1 `.dh` file family.
 *
 * These types describe data that is ONLY ever read, never written: old `.dh`
 * files, their embedded kits, and the v1.5 compact share codec
 * (docs/data-representation.md, "The legacy-read island"). Everything born
 * after the canonical flip is canonical; a legacy knob value is converted to
 * canonical at the frozen migration boundary (migrate-v1.ts) and never reaches
 * a store, the engine, or a new file. Keep every knob-space params type here so
 * the shape cannot leak back into live code.
 */

import type { InstrumentRole } from "@/core/audio/engine/instrument/types";
import type { SampleData } from "@/features/kit/types/sample";
import type { InlineMeta, Meta } from "./meta";

/** A v1 instrument's continuous params as 0-100 knob positions. */
interface LegacyKnobInstrumentParams {
  decay: number;
  filter: number;
  volume: number;
  pan: number;
  tune: number;
  solo: boolean;
  mute: boolean;
}

/** A v1 instrument (embedded-kit pad) with knob-space params. */
interface LegacyKnobInstrumentData {
  meta: InlineMeta;
  role: InstrumentRole;
  sample: SampleData;
  params: LegacyKnobInstrumentParams;
}

/** The kit embedded inside a v1 `.dh` file (knob-space, versioned). */
interface LegacyKitFile {
  kind: "drumhaus.kit";
  version: number;
  meta: Meta;
  instruments: LegacyKnobInstrumentData[];
}

/** The master chain of a v1 `.dh` file / v1.5 share link, as 0-100 knobs. */
interface LegacyKnobMasterChainParams {
  filter: number;
  saturation: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compMix: number;
  masterVolume: number;

  // Even older field spellings, tolerated on read only.
  lowPass?: number;
  highPass?: number;
}

export type {
  LegacyKitFile,
  LegacyKnobInstrumentData,
  LegacyKnobInstrumentParams,
  LegacyKnobMasterChainParams,
};
