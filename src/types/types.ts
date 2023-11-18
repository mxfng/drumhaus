import * as Tone from "tone/build/esm/index";

export type Sample = {
  id: number; // index of the slot
  name: string; // The sample name
  url: string; // The filename of the sample ex. kick.wav
  sampler: Tone.Sampler;
  envelope: Tone.AmplitudeEnvelope;
  filter: Tone.Filter;
  panner: Tone.Panner;
};

export type Sequences = [boolean[], number[]][][];

export type Preset = {
  _samples: Sample[];
  _bpm: number;
  _swing: number;
  _lowPass: number;
  _hiPass: number;
  _phaser: number;
  _reverb: number;
  _masterVolume: number;
  _sequences: Sequences;
  _attacks: number[];
  _releases: number[];
  _filters: number[];
  _volumes: number[];
  _pans: number[];
  _solos: boolean[];
  _mutes: boolean[];
  _variation: number;
  _chain: number;
};
