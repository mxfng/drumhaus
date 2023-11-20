// __Initialization__

import { Kit, SampleData } from "@/types/types";

const wrapToSampleData = (
  urls: [string, string, string, string, string, string, string, string],
  names: string[] = [
    "Kick",
    "Kick2",
    "Snare",
    "Clap",
    "Hat",
    "OHat",
    "Perc",
    "Crash",
  ]
): SampleData[] => {
  return urls.map((url, i) => {
    return { name: names[i], url: url };
  });
};

const debugSamples: SampleData[] = wrapToSampleData([
  "debug/debug_kick.wav",
  "debug/debug_kick2.wav",
  "debug/debug_snare.wav",
  "debug/debug_clap.wav",
  "debug/debug_hat.wav",
  "debug/debug_ohat.wav",
  "debug/debug_bell.wav",
  "debug/debug_crash.wav",
]);

export const drumhaus = (): Kit => ({
  name: "drumhaus",
  samples: debugSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [10, 10, 10, 10, 10, 100, 40, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [92, 92, 92, 92, 92, 92, 92, 70],
  _pans: [50, 50, 50, 50, 50, 50, 50, 50],
  _solos: [false, false, false, false, false, false, false, false],
  _mutes: [false, false, false, false, false, false, false, false],
});

const dylanKiddSamples: SampleData[] = wrapToSampleData([
  "dylanKidd/dk_kick.wav",
  "dylanKidd/dk_kick2.wav",
  "dylanKidd/dk_snare.wav",
  "dylanKidd/dk_clap.wav",
  "dylanKidd/dk_shaker.wav",
  "dylanKidd/dk_stick_click.wav",
  "dylanKidd/dk_sidestick.wav",
  "dylanKidd/dk_chime.wav",
]);

export const dylan_kidd = (): Kit => ({
  name: "dylan_kidd",
  samples: dylanKiddSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [21, 30, 28, 23, 29, 100, 54, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [92, 92, 90, 92, 83, 87, 92, 78],
  _pans: [50, 50, 61, 36, 50, 27, 50, 50],
  _solos: [false, false, false, false, false, false, false, false],
  _mutes: [false, false, false, false, false, false, false, false],
});

const retrowaveSamples: SampleData[] = wrapToSampleData([
  "retrowave/rw_kick.wav",
  "retrowave/rw_kick2.wav",
  "retrowave/rw_snare.wav",
  "retrowave/rw_clap.wav",
  "retrowave/rw_hat.wav",
  "retrowave/rw_ohat.wav",
  "retrowave/rw_perc_flam.wav",
  "retrowave/rw_cymbal.wav",
]);

export const retrowave = (): Kit => ({
  name: "retrowave",
  samples: retrowaveSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [49, 10, 42, 10, 10, 100, 40, 100],
  _filters: [50, 50, 50, 50, 50, 50, 56, 50],
  _pans: [50, 50, 50, 50, 50, 50, 62, 50],
  _volumes: [92, 89, 91, 92, 92, 92, 87, 94],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});
