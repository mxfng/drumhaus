/**
 * Instrument Types
 *
 * Type definitions for instrument runtimes and data.
 * Re-exports main types for convenience.
 */

import { AmplitudeEnvelope, Filter, Panner, Sampler } from "tone";

import { SampleData } from "@/features/kit/types/sample";
import { InlineMeta } from "@/features/preset/types/meta";

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
  lowPassFilterNode: Filter;
  highPassFilterNode: Filter;
  pannerNode: Panner;
}

/**
 * Continuous parameters that are applied directly to audio nodes.
 * These stay active and are updated via subscription.
 */
export interface ContinuousRuntimeParams {
  filter: number;
  pan: number;
  volume: number;
}

/**
 * Per-note parameters that are read during playback.
 * These are NOT applied to audio nodes in advance.
 */
export interface PerNoteParams {
  tune: number;
  decay: number;
  solo: boolean;
  mute: boolean;
}

export interface InstrumentParams {
  decay: number;
  filter: number;
  volume: number;
  pan: number;
  tune: number;
  solo: boolean;
  mute: boolean;
}
