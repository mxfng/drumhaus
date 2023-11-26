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

export type Kit = {
  name: string;
  samples: SampleShell[];
  _attacks: number[];
  _releases: number[];
  _filters: number[];
  _volumes: number[];
  _pans: number[];
  _pitches: number[];
  _solos: boolean[];
  _mutes: boolean[];
};

export type Sequences = [boolean[], number[]][][];

export type Preset = {
  name: string;
  _kit: Kit;
  _sequences: Sequences;
  _variation: number;
  _chain: number;
  _bpm: number;
  _swing: number;
  _lowPass: number;
  _hiPass: number;
  _phaser: number;
  _reverb: number;
  _compThreshold: number;
  _compRatio: number;
  _masterVolume: number;
};
