import * as Tone from "tone/build/esm/index";

export type Sample = {
  name: string; // The sample name
  url: string; // The filename of the sample ex. kick.wav
  sampler: Tone.Sampler; // The Tone.js Sampler to apply the sample to
};

export type SlotData = {
  id: number; // [static] Integer value of the slot
  sample: Sample; // The Tone.js sampler associated witht the slot

  // Envelope
  attack: number; // The envelope applied to the beginning of the sample. 0-1
  release: number; // The envelope applied to the end of the envelope. 0-1

  // Compressor / Dynamics
  // threshold: number; // Compressor threshold in dB
  // ratio: number; // Compressor gain reduction ratio (>0)

  // Master
  volume: number; // In dB
  solo: boolean;
  mute: boolean;
};
