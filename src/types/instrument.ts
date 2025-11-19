import * as Tone from "tone/build/esm/index";

import { InlineMeta, Meta } from "./meta";
import { SampleData } from "./sample";

export interface InstrumentParams {
  attack: number;
  release: number;
  filter: number;
  volume: number;
  pan: number;
  pitch: number;
  solo: boolean;
  mute: boolean;
}

export type InstrumentRole =
  | "kick"
  | "snare"
  | "clap"
  | "hat"
  | "ohat"
  | "tom"
  | "perc"
  | "crash"
  | "bass"
  | "synth"
  | "other";

export interface InstrumentData {
  meta: InlineMeta; // id + display name of this pad
  role: InstrumentRole; // where it lives conceptually in the kit
  sample: SampleData;
  params: InstrumentParams;
}

/**
 * Represents the kit file schema
 */
export interface KitFileV1 {
  kind: "drumhaus.kit";
  version: 1;
  meta: Meta; // kit-level metadata
  instruments: InstrumentData[];
}

/**
 * Represents the runtime audio nodes for an instrument
 * Used during playback and rendering
 */
export interface InstrumentRuntime {
  instrumentId: string; // matches InstrumentData.meta.id
  samplerNode: Tone.Sampler;
  envelopeNode: Tone.AmplitudeEnvelope;
  filterNode: Tone.Filter;
  pannerNode: Tone.Panner;
}
