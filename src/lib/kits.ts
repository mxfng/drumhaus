// __Initialization__

import { Kit, SampleData } from "@/types/types";

const debugSamples: SampleData[] = [
  { name: "Kick", url: "kick/debug_kick.wav" },
  { name: "Kick2", url: "kick2/debug_kick2.wav" },
  { name: "Snare", url: "snare/debug_snare.wav" },
  { name: "Clap", url: "clap/debug_clap.wav" },
  { name: "Hat", url: "hat/debug_hat.wav" },
  { name: "OHat", url: "ohat/debug_ohat.wav" },
  { name: "Bell", url: "bell/debug_bell.wav" },
  { name: "Crash", url: "crash/debug_crash.wav" },
];

export const debug: Kit = {
  name: "debug",
  samples: debugSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [10, 10, 10, 10, 10, 100, 40, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [92, 92, 92, 92, 92, 92, 92, 70],
  _pans: [50, 50, 50, 50, 50, 50, 50, 50],
  _solos: [false, false, false, false, false, false, false, false],
  _mutes: [false, false, false, false, false, false, false, false],
};

const debug2Samples: SampleData[] = [
  { name: "Kick", url: "kick/debug_kick.wav" },
  { name: "Kick2", url: "kick2/debug_kick2.wav" },
  { name: "Snare", url: "snare/superich_snare.wav" },
  { name: "Clap", url: "clap/debug_clap.wav" },
  { name: "Hat", url: "hat/debug_hat.wav" },
  { name: "OHat", url: "ohat/debug_ohat.wav" },
  { name: "Bell", url: "bell/superich_bell.wav" },
  { name: "Crash", url: "crash/debug_crash.wav" },
];

export const debug2: Kit = {
  name: "debug2",
  samples: debug2Samples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [10, 10, 10, 10, 10, 100, 40, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [92, 92, 92, 92, 92, 92, 92, 70],
  _pans: [50, 50, 50, 50, 50, 50, 50, 50],
  _solos: [false, false, false, false, false, false, false, false],
  _mutes: [false, false, false, false, false, false, false, false],
};
