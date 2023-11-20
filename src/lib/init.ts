import { Kit, Preset, Sample, SampleData, Sequences } from "@/types/types";
import * as Tone from "tone/build/esm/index";

// __Initialization__
// Define initial sample URLs
export const _sampleData: SampleData[] = [
  { name: "Kick", url: "kick/debug_kick.wav" },
  { name: "Kick2", url: "kick2/debug_kick2.wav" },
  { name: "Snare", url: "snare/debug_snare.wav" },
  { name: "Clap", url: "clap/debug_clap.wav" },
  { name: "Hat", url: "hat/debug_hat.wav" },
  { name: "OHat", url: "ohat/debug_ohat.wav" },
  { name: "Bell", url: "bell/debug_bell.wav" },
  { name: "Crash", url: "crash/debug_crash.wav" },
];

// Define initial kit
export const _kit = (): Kit => ({
  name: "debug",
  samples: _sampleData,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [10, 10, 10, 10, 10, 100, 100, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [92, 92, 92, 92, 92, 92, 92, 92],
  _pans: [50, 50, 50, 50, 50, 50, 50, 50],
  _solos: [false, false, false, false, false, false, false, false],
  _mutes: [false, false, false, false, false, false, false, false],
});

// Create sequencer objects
// sequences[slot][aOrB][sequencesOrVelocities][step]
// where aOrB represents A as 0 and B as 1
// where sequencesOrVelocities represents sequences as 0 and velocities as 1
//
// [ // sequences
//   [ // slot
//     [ // variation
//       [false, false, false, ..., false],  // hits
//       [1, 1, 1, ..., 1]                   // velocities
//     ],
//     [
//       [false, false, false, ..., false],
//       [1, 1, 1, ..., 1]
//     ]
//   ],
//   [
//     [
//       [false, false, false, ..., false],
//       [1, 1, 1, ..., 1]
//     ],
//     [
//       [false, false, false, ..., false],
//       [1, 1, 1, ..., 1]
//     ]
//   ],
//   // ... (repeated 6 more times)
// ]

export const _sequences = (): Sequences =>
  Array.from({ length: 8 }, () =>
    Array.from({ length: 2 }, () => [
      Array.from({ length: 16 }, () => false),
      Array.from({ length: 16 }, () => 1),
    ])
  );
export const _variation = () => 0;
export const _chain = () => 0;

// Create global parameters
export const _bpm = () => 100;
export const _swing = () => 0;
export const _lowPass = () => 100;
export const _hiPass = () => 0;
export const _phaser = () => 0;
export const _reverb = () => 0;
export const _compThreshold = () => 100;
export const _compRatio = () => 0;
export const _masterVolume = () => 90;

export const createSamples = (samples: SampleData[]) => {
  return samples.map((sample, id) => {
    const filter = new Tone.Filter(0, "highpass");
    const envelope = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
    const panner = new Tone.Panner(0);

    const sampler = new Tone.Sampler({
      urls: {
        ["C2"]: sample.url,
      },
      baseUrl: "/samples/",
      // onload: () => {
      //   console.log(`DHSampler created for ${sample.name}`);
      // },
    });

    return {
      id: id,
      name: sample.name,
      url: sample.url,
      sampler: sampler,
      envelope: envelope,
      filter: filter,
      panner: panner,
    };
  });
};

// Create initial Drumhaus sampler objects
export const _samples: Sample[] = createSamples(_sampleData);

export const createPreset = (): Preset => ({
  name: "init",
  _kit: _kit(),
  _bpm: _bpm(),
  _swing: _swing(),
  _lowPass: _lowPass(),
  _hiPass: _hiPass(),
  _phaser: _phaser(),
  _reverb: _reverb(),
  _compThreshold: _compThreshold(),
  _compRatio: _compRatio(),
  _masterVolume: _masterVolume(),
  _sequences: _sequences(),
  _variation: _variation(),
  _chain: _chain(),
});
