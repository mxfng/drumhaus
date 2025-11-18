import * as Tone from "tone/build/esm/index";

import type { Pattern } from "@/lib/pattern/types";

/**
 * Serializable instrument data (no Tone.js objects)
 * Used in Kit definitions and preset storage
 * Contains all parameters for a single instrument
 * Note: index is not stored - use array index instead
 */
export interface InstrumentData {
  name: string;
  url: string;
  attack: number;
  release: number;
  filter: number;
  volume: number;
  pan: number;
  pitch: number;
  solo: boolean;
  mute: boolean;
}

/**
 * Runtime instrument with Tone.js audio nodes
 * Created from InstrumentData when kit is loaded
 */
export interface InstrumentRuntime {
  samplerNode: Tone.Sampler;
  envelopeNode: Tone.AmplitudeEnvelope;
  filterNode: Tone.Filter;
  pannerNode: Tone.Panner;
}

/**
 * Complete instrument - combines serializable data with runtime audio nodes
 * Used during playback and rendering
 */
export type Instrument = InstrumentData & InstrumentRuntime;

/**
 * Serializable kit definition
 * Contains an array of 8 instruments with all their parameters
 */
export interface Kit {
  name: string;
  instruments: InstrumentData[];
}

export type VariationCycle = "A" | "B" | "AB" | "AAAB";

export interface Preset {
  name: string;
  kit: Kit;
  pattern: Pattern;
  bpm: number;
  swing: number;
  variationCycle: VariationCycle;
  masterChain: {
    lowPass: number;
    hiPass: number;
    phaser: number;
    reverb: number;
    compThreshold: number;
    compRatio: number;
    masterVolume: number;
  };
}

// legacy
export type Sequences = [boolean[], number[]][][];
