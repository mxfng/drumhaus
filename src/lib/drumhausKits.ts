import type { InstrumentData } from "@/lib/instrument/types";
import type { Kit } from "@/types/types";

/**
 * Helper to create InstrumentData from parallel arrays
 * Merges name/url arrays with parameter arrays into a single InstrumentData object per instrument
 */
const createInstruments = (
  samples: Array<{ name: string; url: string }>,
  params?: {
    attacks?: number[];
    releases?: number[];
    filters?: number[];
    volumes?: number[];
    pans?: number[];
    pitches?: number[];
    solos?: boolean[];
    mutes?: boolean[];
  },
): InstrumentData[] => {
  return samples.map((sample, i) => ({
    name: sample.name,
    url: sample.url,
    attack: params?.attacks?.[i] ?? 0,
    release: params?.releases?.[i] ?? 100,
    filter: params?.filters?.[i] ?? 50,
    volume: params?.volumes?.[i] ?? 92,
    pan: params?.pans?.[i] ?? 50,
    pitch: params?.pitches?.[i] ?? 50,
    solo: params?.solos?.[i] ?? false,
    mute: params?.mutes?.[i] ?? false,
  }));
};

export const drumhaus = (): Kit => ({
  name: "drumhaus",
  instruments: createInstruments([
    { name: "Kick", url: "0/kick.wav" },
    { name: "Kick2", url: "0/kick2.wav" },
    { name: "Snare", url: "0/snare.wav" },
    { name: "Clap", url: "0/clap.wav" },
    { name: "Hat", url: "0/hat.wav" },
    { name: "OHat", url: "0/ohat.wav" },
    { name: "Tom", url: "0/tom.wav" },
    { name: "Tom2", url: "0/tom2.wav" },
  ]),
});

export const organic = (): Kit => ({
  name: "organic",
  instruments: createInstruments(
    [
      { name: "Kick", url: "3/dk_kick.wav" },
      { name: "Kick2", url: "3/dk_kick2.wav" },
      { name: "Snare", url: "3/dk_snare.wav" },
      { name: "Clap", url: "3/dk_clap.wav" },
      { name: "Hat", url: "3/dk_shaker.wav" },
      { name: "Stick", url: "3/dk_stick_click.wav" },
      { name: "Perc", url: "3/dk_sidestick.wav" },
      { name: "Chime", url: "3/dk_chime.wav" },
    ],
    {
      releases: [21, 30, 28, 23, 29, 100, 54, 100],
      volumes: [92, 92, 90, 92, 83, 87, 92, 78],
      pans: [50, 50, 61, 36, 50, 27, 50, 50],
    },
  ),
});

export const funk = (): Kit => ({
  name: "funk",
  instruments: createInstruments(
    [
      { name: "Kick", url: "1/rw_kick.wav" },
      { name: "Kick2", url: "1/rw_kick2.wav" },
      { name: "Snare", url: "1/rw_snare.wav" },
      { name: "Clap", url: "1/rw_clap.wav" },
      { name: "Hat", url: "1/rw_hat.wav" },
      { name: "OHat", url: "1/rw_ohat.wav" },
      { name: "Tom", url: "1/rw_perc_flam.wav" },
      { name: "Crash", url: "1/rw_cymbal.wav" },
    ],
    {
      releases: [49, 10, 42, 10, 10, 100, 40, 100],
      filters: [50, 50, 50, 50, 50, 50, 56, 50],
      pans: [50, 50, 50, 50, 50, 50, 62, 50],
      volumes: [82, 79, 77, 82, 82, 82, 79, 84],
    },
  ),
});

export const rnb = (): Kit => ({
  name: "rnb",
  instruments: createInstruments(
    [
      { name: "Kick", url: "6/superich_kick.wav" },
      { name: "Kick2", url: "6/superich_kick2.wav" },
      { name: "Snare", url: "6/superich_snare.wav" },
      { name: "Snare2", url: "6/superich_tap.wav" },
      { name: "Hat", url: "6/superich_hat.wav" },
      { name: "OHat", url: "6/superich_ohat.wav" },
      { name: "Perc", url: "6/superich_clav.wav" },
      { name: "Crash", url: "6/superich_ride.wav" },
    ],
    {
      releases: [49, 10, 42, 10, 10, 100, 40, 100],
      filters: [50, 50, 56, 50, 50, 50, 56, 50],
      pans: [50, 70, 50, 50, 36, 50, 62, 50],
      volumes: [100, 97, 99, 100, 97, 97, 85, 100],
    },
  ),
});

export const trap = (): Kit => ({
  name: "trap",
  instruments: createInstruments(
    [
      { name: "Kick", url: "4/ts_kick.wav" },
      { name: "Kick2", url: "4/ts_kick2.wav" },
      { name: "Snare", url: "4/ts_snare.wav" },
      { name: "Clap", url: "4/ts_clap.wav" },
      { name: "Hat", url: "4/ts_hat.wav" },
      { name: "OHat", url: "4/ts_ohat.wav" },
      { name: "Hat2", url: "4/ts_hat2.wav" },
      { name: "Hat3", url: "4/ts_hat3.wav" },
    ],
    {
      attacks: [0, 20, 0, 0, 0, 0, 0, 0],
      releases: [49, 63, 42, 100, 10, 100, 40, 100],
      filters: [50, 50, 56, 50, 50, 50, 56, 50],
      pans: [50, 70, 50, 50, 36, 50, 62, 50],
      volumes: [84, 80, 86, 59, 89, 90, 85, 88],
    },
  ),
});

export const eighties = (): Kit => ({
  name: "eighties",
  instruments: createInstruments(
    [
      { name: "Kick", url: "5/hs_kick.wav" },
      { name: "Kick2", url: "5/hs_kick2.wav" },
      { name: "Snare", url: "5/hs_snare.wav" },
      { name: "Clap", url: "5/hs_clap.wav" },
      { name: "Hat", url: "5/hs_hat.wav" },
      { name: "OHat", url: "5/hs_ohat.wav" },
      { name: "Perc", url: "5/hs_perc.wav" },
      { name: "Crash", url: "5/hs_crash.wav" },
    ],
    {
      attacks: [0, 20, 0, 0, 4, 0, 0, 0],
      releases: [49, 63, 42, 36, 26, 100, 43, 100],
      filters: [50, 50, 54, 50, 50, 50, 55, 50],
      pans: [50, 70, 50, 50, 36, 50, 62, 50],
      volumes: [91, 77, 85, 79, 86, 90, 74, 88],
    },
  ),
});

export const tech_house = (): Kit => ({
  name: "tech_house",
  instruments: createInstruments(
    [
      { name: "Kick", url: "2/paris_kick.wav" },
      { name: "Bass", url: "2/paris_bass.wav" },
      { name: "Snare", url: "2/paris_snare.wav" },
      { name: "Clap", url: "2/paris_clap.wav" },
      { name: "Hat", url: "2/paris_hat.wav" },
      { name: "OHat", url: "2/paris_ohat.wav" },
      { name: "Piano", url: "2/paris_p_E.wav" },
      { name: "Piano2", url: "2/paris_p_Abm.wav" },
    ],
    {
      attacks: [0, 20, 0, 0, 4, 0, 0, 0],
      releases: [49, 63, 42, 40, 43, 100, 79, 100],
      filters: [50, 50, 54, 50, 50, 50, 55, 50],
      pans: [50, 50, 50, 50, 50, 50, 35, 66],
      volumes: [83, 83, 85, 87, 70, 82, 80, 79],
    },
  ),
});

export const techno = (): Kit => ({
  name: "techno",
  instruments: createInstruments(
    [
      { name: "Kick", url: "7/berlin_kick.wav" },
      { name: "Bass", url: "7/berlin_bass.wav" },
      { name: "Snare", url: "7/berlin_snare.wav" },
      { name: "Clap", url: "7/berlin_clap.wav" },
      { name: "Hat", url: "7/berlin_hat.wav" },
      { name: "OHat", url: "7/berlin_ohat.wav" },
      { name: "Synth", url: "7/berlin_stab.wav" },
      { name: "Synth2", url: "7/berlin_loop.wav" },
    ],
    {
      attacks: [0, 100, 0, 0, 4, 33, 0, 0],
      releases: [49, 19, 42, 40, 43, 12, 79, 100],
      filters: [50, 4, 54, 50, 50, 50, 55, 50],
      pans: [50, 50, 50, 50, 36, 62, 35, 66],
      volumes: [92, 90, 85, 78, 74, 73, 85, 88],
    },
  ),
});

export const indie = (): Kit => ({
  name: "indie",
  instruments: createInstruments(
    [
      { name: "Kick", url: "9/kick_puffy.wav" },
      { name: "Tom", url: "9/tom_clonk.wav" },
      { name: "Snare", url: "9/snare_together.wav" },
      { name: "Clap", url: "9/clap_hectic.wav" },
      { name: "Hat", url: "9/hat_crisp.wav" },
      { name: "OHat", url: "9/ohat_thick.wav" },
      { name: "Perc", url: "9/perc_jungle.wav" },
      { name: "Crash", url: "9/crash_legend.wav" },
    ],
    {
      releases: [100, 100, 100, 43, 29, 100, 54, 100],
      pans: [50, 50, 50, 37, 50, 50, 50, 50],
      volumes: [96, 88, 98, 76, 84, 80, 92, 78],
    },
  ),
});

export const jungle = (): Kit => ({
  name: "jungle",
  instruments: createInstruments(
    [
      { name: "Kick", url: "8/indie_kick.wav" },
      { name: "Kick2", url: "8/indie_kick2.wav" },
      { name: "Snare", url: "8/indie_snare.wav" },
      { name: "Snare2", url: "8/indie_snare2.wav" },
      { name: "Hat", url: "8/indie_hat.wav" },
      { name: "OHat", url: "8/indie_ohat.wav" },
      { name: "Cymbal", url: "8/indie_cymbal.wav" },
      { name: "Crash", url: "8/indie_crash.wav" },
    ],
    {
      attacks: [0, 0, 0, 0, 0, 0, 0, 15],
      releases: [31, 100, 100, 43, 29, 100, 54, 90],
      filters: [13, 55, 58, 50, 50, 50, 50, 26],
      pans: [50, 50, 50, 37, 50, 50, 33, 50],
      volumes: [94, 81, 95, 76, 84, 75, 92, 76],
    },
  ),
});
