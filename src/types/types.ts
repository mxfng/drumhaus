import * as Tone from "tone/build/esm/index";

export type SampleData = {
  name: string;
  url: string;
};

export type Sample = {
  id: number; // index of the slot
  name: string; // The sample name
  url: string; // The filename of the sample ex. kick.wav
  sampler: Tone.Sampler;
  envelope: Tone.AmplitudeEnvelope;
  filter: Tone.Filter;
  panner: Tone.Panner;
};

export type SampleShell = {
  name: string;
  url: string;
};

export type Sequences = [boolean[], number[]][][];

export type Preset = {
  name: string;
  _samples: SampleShell[];
  _bpm: number;
  _swing: number;
  _lowPass: number;
  _hiPass: number;
  _phaser: number;
  _reverb: number;
  _compThreshold: number;
  _compRatio: number;
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
