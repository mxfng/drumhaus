import * as Tone from "tone/build/esm/index";

// samples load into samplers, samplers load into slots

// DHSampler contains a sample filename and its sampler
export type DHSampler = {
  name: string;
  url: string; // The filename of the sample ex. kick.wav
  sampler: Tone.Sampler; // The Tone.js Sampler to apply the sample to
};

// Drumhaus has 8 slots
// Slots contain sampler and params to update the sampler
export type SlotData = {
  id: number; // [static] Integer value of the slot
  name: string; // [static] Name of the slot
  sampler: DHSampler; // The Tone.js sampler associated witht the slot

  // Envelope
  // attack: number; // The envelope applied to the beginning of the sample. 0-1
  // release: number; // The envelope applied to the end of the envelope. 0-1
  // curve: string; // The shape of the attack/release curve. Either "linear" or "exponential"

  // Compressor / Dynamics
  // threshold: number; // Compressor threshold in dB
  // ratio: number; // Compressor gain reduction ratio (>0)

  // Master
  volume: number; // In dB
  solo: boolean;
  mute: boolean;
};

// Drumhaus global settings
export type Settings = {
  masterVolume: number; // The volume of the output in decibels.
  masterCompress: number;
  bpm: number;
  swing: number;
  accent: number;
  // Add more later
};
