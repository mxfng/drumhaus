import * as Tone from "tone/build/esm/index";

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

export interface Kit {
  name: string;
  instruments: InstrumentData[];
}
