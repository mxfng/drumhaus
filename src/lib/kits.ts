// __Initialization__

import { Kit, Sample, SampleData } from "@/types/types";

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
  _volumes: [82, 79, 77, 82, 82, 82, 79, 84],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const superichSamples: SampleData[] = wrapToSampleData([
  "superich/superich_kick.wav",
  "superich/superich_kick2.wav",
  "superich/superich_snare.wav",
  "superich/superich_tap.wav",
  "superich/superich_hat.wav",
  "superich/superich_ohat.wav",
  "superich/superich_clav.wav",
  "superich/superich_ride.wav",
]);

export const superich = (): Kit => ({
  name: "superich",
  samples: superichSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [49, 10, 42, 10, 10, 100, 40, 100],
  _filters: [50, 50, 56, 50, 50, 50, 56, 50],
  _pans: [50, 70, 50, 50, 36, 50, 62, 50],
  _volumes: [100, 97, 99, 100, 97, 97, 85, 100],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const decapSamples: SampleData[] = wrapToSampleData([
  "trapstar/ts_kick.wav",
  "trapstar/ts_kick2.wav",
  "trapstar/ts_snare.wav",
  "trapstar/ts_clap.wav",
  "trapstar/ts_hat.wav",
  "trapstar/ts_ohat.wav",
  "trapstar/ts_hat2.wav",
  "trapstar/ts_hat3.wav",
]);

export const trapstar = (): Kit => ({
  name: "trapstar",
  samples: decapSamples,
  _attacks: [0, 20, 0, 0, 0, 0, 0, 0],
  _releases: [49, 63, 42, 100, 10, 100, 40, 100],
  _filters: [50, 50, 56, 50, 50, 50, 56, 50],
  _pans: [50, 70, 50, 50, 36, 50, 62, 50],
  _volumes: [91, 77, 86, 79, 89, 90, 85, 88],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const hairspraySamples: SampleData[] = wrapToSampleData([
  "hairspray/hs_kick.wav",
  "hairspray/hs_kick2.wav",
  "hairspray/hs_snare.wav",
  "hairspray/hs_clap.wav",
  "hairspray/hs_hat.wav",
  "hairspray/hs_ohat.wav",
  "hairspray/hs_perc.wav",
  "hairspray/hs_crash.wav",
]);

export const hairspray = (): Kit => ({
  name: "hairspray",
  samples: hairspraySamples,
  _attacks: [0, 20, 0, 0, 4, 0, 0, 0],
  _releases: [49, 63, 42, 36, 26, 100, 43, 100],
  _filters: [50, 50, 54, 50, 50, 50, 55, 50],
  _pans: [50, 70, 50, 50, 36, 50, 62, 50],
  _volumes: [91, 77, 85, 79, 86, 90, 85, 88],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const parisSamples: SampleData[] = wrapToSampleData(
  [
    "paris/paris_kick.wav",
    "paris/paris_bass.wav",
    "paris/paris_snare.wav",
    "paris/paris_clap.wav",
    "paris/paris_hat.wav",
    "paris/paris_ohat.wav",
    "paris/paris_p_E.wav",
    "paris/paris_p_Abm.wav",
  ],
  ["Kick", "Bass", "Snare", "Clap", "Hat", "OHat", "Piano", "Piano"]
);

export const paris = (): Kit => ({
  name: "paris",
  samples: parisSamples,
  _attacks: [0, 20, 0, 0, 4, 0, 0, 0],
  _releases: [49, 63, 42, 40, 43, 100, 79, 100],
  _filters: [50, 50, 54, 50, 50, 50, 55, 50],
  _pans: [50, 50, 50, 50, 50, 50, 35, 66],
  _volumes: [83, 83, 85, 87, 70, 82, 80, 79],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const berlinSamples: SampleData[] = wrapToSampleData(
  [
    "berlin/berlin_kick.wav",
    "berlin/berlin_bass.wav",
    "berlin/berlin_snare.wav",
    "berlin/berlin_clap.wav",
    "berlin/berlin_hat.wav",
    "berlin/berlin_ohat.wav",
    "berlin/berlin_stab.wav",
    "berlin/berlin_loop.wav",
  ],
  ["Kick", "Bass", "Snare", "Clap", "Hat", "OHat", "Synth", "Synth"]
);

export const berlin = (): Kit => ({
  name: "berlin",
  samples: berlinSamples,
  _attacks: [0, 100, 0, 0, 4, 33, 0, 0],
  _releases: [49, 19, 42, 40, 43, 12, 79, 100],
  _filters: [50, 4, 54, 50, 50, 50, 55, 50],
  _pans: [50, 50, 50, 50, 36, 62, 35, 66],
  _volumes: [92, 90, 85, 78, 74, 73, 85, 88],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});
