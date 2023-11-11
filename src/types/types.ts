export type Sample = { id: string; url: string; mapToSampler: string };

// Constrain to 8 samples
// Tone.Sampler requires us to explicitly specify the musical note of each sample
export type Samples = [
  Sample,
  Sample,
  Sample,
  Sample,
  Sample,
  Sample,
  Sample,
  Sample
];

export type Settings = {
  volume: number;
  compress: number;
  bpm: number;
  swing: number;
  accent: number;
  // Add more later
};

export type Preset = {
  name: string;
  samples: Sample[];
  settings: Settings;
};
