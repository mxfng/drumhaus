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

const drumhausSamples: SampleData[] = [
  { name: "Kick", url: "0/kick.wav" },
  { name: "Kick2", url: "0/kick2.wav" },
  { name: "Snare", url: "0/snare.wav" },
  { name: "Clap", url: "0/clap.wav" },
  { name: "Hat", url: "0/hat.wav" },
  { name: "OHat", url: "0/ohat.wav" },
  { name: "Tom", url: "0/tom.wav" },
  { name: "Tom2", url: "0/tom2.wav" },
];

export const drumhaus = (): Kit => ({
  name: "drumhaus",
  samples: drumhausSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [100, 100, 100, 100, 100, 100, 100, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [92, 92, 92, 92, 92, 92, 92, 92],
  _pans: [50, 50, 50, 50, 50, 50, 50, 50],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _solos: [false, false, false, false, false, false, false, false],
  _mutes: [false, false, false, false, false, false, false, false],
});

const organicSamples: SampleData[] = wrapToSampleData(
  [
    "3/dk_kick.wav",
    "3/dk_kick2.wav",
    "3/dk_snare.wav",
    "3/dk_clap.wav",
    "3/dk_shaker.wav",
    "3/dk_stick_click.wav",
    "3/dk_sidestick.wav",
    "3/dk_chime.wav",
  ],
  ["Kick", "Kick2", "Snare", "Clap", "Hat", "Stick", "Perc", "Chime"]
);

export const organic = (): Kit => ({
  name: "organic",
  samples: organicSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [21, 30, 28, 23, 29, 100, 54, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [92, 92, 90, 92, 83, 87, 92, 78],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _pans: [50, 50, 61, 36, 50, 27, 50, 50],
  _solos: [false, false, false, false, false, false, false, false],
  _mutes: [false, false, false, false, false, false, false, false],
});

const funkSamples: SampleData[] = wrapToSampleData(
  [
    "1/rw_kick.wav",
    "1/rw_kick2.wav",
    "1/rw_snare.wav",
    "1/rw_clap.wav",
    "1/rw_hat.wav",
    "1/rw_ohat.wav",
    "1/rw_perc_flam.wav",
    "1/rw_cymbal.wav",
  ],
  ["Kick", "Kick2", "Snare", "Clap", "Hat", "OHat", "Tom", "Crash"]
);

export const funk = (): Kit => ({
  name: "funk",
  samples: funkSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [49, 10, 42, 10, 10, 100, 40, 100],
  _filters: [50, 50, 50, 50, 50, 50, 56, 50],
  _pans: [50, 50, 50, 50, 50, 50, 62, 50],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _volumes: [82, 79, 77, 82, 82, 82, 79, 84],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const rnbSamples: SampleData[] = wrapToSampleData(
  [
    "6/superich_kick.wav",
    "6/superich_kick2.wav",
    "6/superich_snare.wav",
    "6/superich_tap.wav",
    "6/superich_hat.wav",
    "6/superich_ohat.wav",
    "6/superich_clav.wav",
    "6/superich_ride.wav",
  ],
  ["Kick", "Kick2", "Snare", "Snare2", "Hat", "OHat", "Perc", "Crash"]
);

export const rnb = (): Kit => ({
  name: "rnb",
  samples: rnbSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [49, 10, 42, 10, 10, 100, 40, 100],
  _filters: [50, 50, 56, 50, 50, 50, 56, 50],
  _pans: [50, 70, 50, 50, 36, 50, 62, 50],
  _volumes: [100, 97, 99, 100, 97, 97, 85, 100],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const trapSamples: SampleData[] = wrapToSampleData(
  [
    "4/ts_kick.wav",
    "4/ts_kick2.wav",
    "4/ts_snare.wav",
    "4/ts_clap.wav",
    "4/ts_hat.wav",
    "4/ts_ohat.wav",
    "4/ts_hat2.wav",
    "4/ts_hat3.wav",
  ],
  ["Kick", "Kick2", "Snare", "Clap", "Hat", "OHat", "Hat2", "Hat3"]
);

export const trap = (): Kit => ({
  name: "trap",
  samples: trapSamples,
  _attacks: [0, 20, 0, 0, 0, 0, 0, 0],
  _releases: [49, 63, 42, 100, 10, 100, 40, 100],
  _filters: [50, 50, 56, 50, 50, 50, 56, 50],
  _pans: [50, 70, 50, 50, 36, 50, 62, 50],
  _volumes: [84, 80, 86, 59, 89, 90, 85, 88],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const eightiesSamples: SampleData[] = wrapToSampleData([
  "5/hs_kick.wav",
  "5/hs_kick2.wav",
  "5/hs_snare.wav",
  "5/hs_clap.wav",
  "5/hs_hat.wav",
  "5/hs_ohat.wav",
  "5/hs_perc.wav",
  "5/hs_crash.wav",
]);

export const eighties = (): Kit => ({
  name: "eighties",
  samples: eightiesSamples,
  _attacks: [0, 20, 0, 0, 4, 0, 0, 0],
  _releases: [49, 63, 42, 36, 26, 100, 43, 100],
  _filters: [50, 50, 54, 50, 50, 50, 55, 50],
  _pans: [50, 70, 50, 50, 36, 50, 62, 50],
  _volumes: [91, 77, 85, 79, 86, 90, 74, 88],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const tech_houseSamples: SampleData[] = wrapToSampleData(
  [
    "2/paris_kick.wav",
    "2/paris_bass.wav",
    "2/paris_snare.wav",
    "2/paris_clap.wav",
    "2/paris_hat.wav",
    "2/paris_ohat.wav",
    "2/paris_p_E.wav",
    "2/paris_p_Abm.wav",
  ],
  ["Kick", "Bass", "Snare", "Clap", "Hat", "OHat", "Piano", "Piano2"]
);

export const tech_house = (): Kit => ({
  name: "tech_house",
  samples: tech_houseSamples,
  _attacks: [0, 20, 0, 0, 4, 0, 0, 0],
  _releases: [49, 63, 42, 40, 43, 100, 79, 100],
  _filters: [50, 50, 54, 50, 50, 50, 55, 50],
  _pans: [50, 50, 50, 50, 50, 50, 35, 66],
  _volumes: [83, 83, 85, 87, 70, 82, 80, 79],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const technoSamples: SampleData[] = wrapToSampleData(
  [
    "7/berlin_kick.wav",
    "7/berlin_bass.wav",
    "7/berlin_snare.wav",
    "7/berlin_clap.wav",
    "7/berlin_hat.wav",
    "7/berlin_ohat.wav",
    "7/berlin_stab.wav",
    "7/berlin_loop.wav",
  ],
  ["Kick", "Bass", "Snare", "Clap", "Hat", "OHat", "Synth", "Synth2"]
);

export const techno = (): Kit => ({
  name: "techno",
  samples: technoSamples,
  _attacks: [0, 100, 0, 0, 4, 33, 0, 0],
  _releases: [49, 19, 42, 40, 43, 12, 79, 100],
  _filters: [50, 4, 54, 50, 50, 50, 55, 50],
  _pans: [50, 50, 50, 50, 36, 62, 35, 66],
  _volumes: [92, 90, 85, 78, 74, 73, 85, 88],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const indieSamples: SampleData[] = wrapToSampleData([
  "9/kick_puffy.wav",
  "9/tom_clonk.wav",
  "9/snare_together.wav",
  "9/clap_hectic.wav",
  "9/hat_crisp.wav",
  "9/ohat_thick.wav",
  "9/perc_jungle.wav",
  "9/crash_legend.wav",
]);

export const indie = (): Kit => ({
  name: "indie",
  samples: indieSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],
  _releases: [100, 100, 100, 43, 29, 100, 54, 100],
  _filters: [50, 50, 50, 50, 50, 50, 50, 50],
  _pans: [50, 50, 50, 37, 50, 50, 50, 50],
  _volumes: [96, 88, 98, 76, 84, 80, 92, 78],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});

const jungleSamples: SampleData[] = wrapToSampleData([
  "8/indie_kick.wav",
  "8/indie_kick2.wav",
  "8/indie_snare.wav",
  "8/indie_snare2.wav",
  "8/indie_hat.wav",
  "8/indie_ohat.wav",
  "8/indie_cymbal.wav",
  "8/indie_crash.wav",
]);

export const jungle = (): Kit => ({
  name: "jungle",
  samples: jungleSamples,
  _attacks: [0, 0, 0, 0, 0, 0, 0, 15],
  _releases: [31, 100, 100, 43, 29, 100, 54, 90],
  _filters: [13, 55, 58, 50, 50, 50, 50, 26],
  _pans: [50, 50, 50, 37, 50, 50, 33, 50],
  _volumes: [94, 81, 95, 76, 84, 75, 92, 76],
  _pitches: [50, 50, 50, 50, 50, 50, 50, 50],
  _mutes: [false, false, false, false, false, false, false, false],
  _solos: [false, false, false, false, false, false, false, false],
});
