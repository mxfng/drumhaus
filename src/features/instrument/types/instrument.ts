import {
  AmplitudeEnvelope,
  Filter,
  Meter,
  Panner,
  Sampler,
} from "tone/build/esm/index";

import { SampleData } from "@/features/kit/types/sample";
import { InlineMeta } from "@/features/preset/types/meta";

export interface InstrumentParams {
  decay: number;
  filter: number;
  volume: number;
  pan: number;
  tune: number;
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
 * Represents the runtime audio nodes for an instrument
 * Used during playback and rendering
 */
export interface InstrumentRuntime {
  instrumentId: string; // matches InstrumentData.meta.id
  samplerNode: Sampler;
  /** Used for decay envelope and pseudo-monophonic behavior */
  envelopeNode: AmplitudeEnvelope;
  filterNode: Filter;
  pannerNode: Panner;
  /** Meter for measuring output level (for UI gain meter) */
  meterNode: Meter;
}
