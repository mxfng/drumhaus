import * as Tone from "tone/build/esm/index";

export type Sample = {
  id: number; // index of the slot
  name: string; // The sample name
  url: string; // The filename of the sample ex. kick.wav
  sampler: Tone.Sampler;
  envelope: Tone.AmplitudeEnvelope;
  filter: Tone.Filter;
};
