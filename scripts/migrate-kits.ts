import * as fs from "fs";
import * as path from "path";

/**
 * This script migrates the old legacy kits to the new .dhkit format.
 */

type InstrumentRole =
  | "kick"
  | "snare"
  | "clap"
  | "hat"
  | "ohat"
  | "tom"
  | "perc"
  | "crash"
  | "bass"
  | "synth"
  | "other";

interface OldKitData {
  name: string;
  samples: Array<{ name: string; url: string }>;
  params?: {
    attacks?: number[];
    releases?: number[];
    filters?: number[];
    volumes?: number[];
    pans?: number[];
    pitches?: number[];
    solos?: boolean[];
    mutes?: boolean[];
  };
  attribution?: {
    status: string;
    label?: string;
    creditName?: string;
  };
}

interface KitFileV1 {
  kind: "drumhaus.kit";
  version: 1;
  meta: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    author?: string;
  };
  instruments: Array<{
    meta: { id: string; name: string };
    role: InstrumentRole;
    sample: {
      meta: { id: string; name: string };
      path: string;
      attribution?: {
        status: string;
        label?: string;
        creditName?: string;
      };
    };
    params: {
      attack: number;
      release: number;
      filter: number;
      volume: number;
      pan: number;
      pitch: number;
      solo: boolean;
      mute: boolean;
    };
  }>;
}

/**
 * Infer instrument role from name
 */
function inferRole(name: string): InstrumentRole {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("kick")) return "kick";
  if (lowerName.includes("snare")) return "snare";
  if (lowerName.includes("clap")) return "clap";
  if (lowerName.includes("hat") && !lowerName.includes("ohat")) return "hat";
  if (lowerName.includes("ohat")) return "ohat";
  if (lowerName.includes("tom")) return "tom";
  if (
    lowerName.includes("perc") ||
    lowerName.includes("stick") ||
    lowerName.includes("shaker") ||
    lowerName.includes("chime") ||
    lowerName.includes("flam") ||
    lowerName.includes("clav")
  )
    return "perc";
  if (
    lowerName.includes("crash") ||
    lowerName.includes("cymbal") ||
    lowerName.includes("ride")
  )
    return "crash";
  if (lowerName.includes("bass")) return "bass";
  if (
    lowerName.includes("synth") ||
    lowerName.includes("piano") ||
    lowerName.includes("stab") ||
    lowerName.includes("loop")
  )
    return "synth";

  return "other";
}

/**
 * Convert old kit format to new KitFileV1 format
 */
function migrateKit(oldKit: OldKitData): KitFileV1 {
  const timestamp = new Date().toISOString();
  const kitId = `kit-${oldKit.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

  return {
    kind: "drumhaus.kit",
    version: 1,
    meta: {
      id: kitId,
      name: oldKit.name,
      createdAt: timestamp,
      updatedAt: timestamp,
      author: "Max Fung",
    },
    instruments: oldKit.samples.map((sample, i) => ({
      meta: {
        id: `${kitId}-inst-${i}`,
        name: sample.name,
      },
      role: inferRole(sample.name),
      sample: {
        meta: {
          id: `${kitId}-sample-${i}`,
          name: sample.name,
        },
        path: sample.url,
        attribution: oldKit.attribution,
      },
      params: {
        attack: oldKit.params?.attacks?.[i] ?? 0,
        release: oldKit.params?.releases?.[i] ?? 100,
        filter: oldKit.params?.filters?.[i] ?? 50,
        volume: oldKit.params?.volumes?.[i] ?? 92,
        pan: oldKit.params?.pans?.[i] ?? 50,
        pitch: oldKit.params?.pitches?.[i] ?? 50,
        solo: oldKit.params?.solos?.[i] ?? false,
        mute: oldKit.params?.mutes?.[i] ?? false,
      },
    })),
  };
}

// Define all the old kits to migrate
const kitsToMigrate: OldKitData[] = [
  {
    name: "organic",
    samples: [
      { name: "Kick", url: "3/dk_kick.wav" },
      { name: "Kick2", url: "3/dk_kick2.wav" },
      { name: "Snare", url: "3/dk_snare.wav" },
      { name: "Clap", url: "3/dk_clap.wav" },
      { name: "Hat", url: "3/dk_shaker.wav" },
      { name: "Stick", url: "3/dk_stick_click.wav" },
      { name: "Perc", url: "3/dk_sidestick.wav" },
      { name: "Chime", url: "3/dk_chime.wav" },
    ],
    params: {
      releases: [21, 30, 28, 23, 29, 100, 54, 100],
      volumes: [92, 92, 90, 92, 83, 87, 92, 78],
      pans: [50, 50, 61, 36, 50, 27, 50, 50],
    },
  },
  {
    name: "funk",
    samples: [
      { name: "Kick", url: "1/rw_kick.wav" },
      { name: "Kick2", url: "1/rw_kick2.wav" },
      { name: "Snare", url: "1/rw_snare.wav" },
      { name: "Clap", url: "1/rw_clap.wav" },
      { name: "Hat", url: "1/rw_hat.wav" },
      { name: "OHat", url: "1/rw_ohat.wav" },
      { name: "Tom", url: "1/rw_perc_flam.wav" },
      { name: "Crash", url: "1/rw_cymbal.wav" },
    ],
    params: {
      releases: [49, 10, 42, 10, 10, 100, 40, 100],
      filters: [50, 50, 50, 50, 50, 50, 56, 50],
      pans: [50, 50, 50, 50, 50, 50, 62, 50],
      volumes: [82, 79, 77, 82, 82, 82, 79, 84],
    },
  },
  {
    name: "rnb",
    samples: [
      { name: "Kick", url: "6/superich_kick.wav" },
      { name: "Kick2", url: "6/superich_kick2.wav" },
      { name: "Snare", url: "6/superich_snare.wav" },
      { name: "Snare2", url: "6/superich_tap.wav" },
      { name: "Hat", url: "6/superich_hat.wav" },
      { name: "OHat", url: "6/superich_ohat.wav" },
      { name: "Perc", url: "6/superich_clav.wav" },
      { name: "Crash", url: "6/superich_ride.wav" },
    ],
    params: {
      releases: [49, 10, 42, 10, 10, 100, 40, 100],
      filters: [50, 50, 56, 50, 50, 50, 56, 50],
      pans: [50, 70, 50, 50, 36, 50, 62, 50],
      volumes: [100, 97, 99, 100, 97, 97, 85, 100],
    },
  },
  {
    name: "trap",
    samples: [
      { name: "Kick", url: "4/ts_kick.wav" },
      { name: "Kick2", url: "4/ts_kick2.wav" },
      { name: "Snare", url: "4/ts_snare.wav" },
      { name: "Clap", url: "4/ts_clap.wav" },
      { name: "Hat", url: "4/ts_hat.wav" },
      { name: "OHat", url: "4/ts_ohat.wav" },
      { name: "Hat2", url: "4/ts_hat2.wav" },
      { name: "Hat3", url: "4/ts_hat3.wav" },
    ],
    params: {
      attacks: [0, 20, 0, 0, 0, 0, 0, 0],
      releases: [49, 63, 42, 100, 10, 100, 40, 100],
      filters: [50, 50, 56, 50, 50, 50, 56, 50],
      pans: [50, 70, 50, 50, 36, 50, 62, 50],
      volumes: [84, 80, 86, 59, 89, 90, 85, 88],
    },
  },
  {
    name: "eighties",
    samples: [
      { name: "Kick", url: "5/hs_kick.wav" },
      { name: "Kick2", url: "5/hs_kick2.wav" },
      { name: "Snare", url: "5/hs_snare.wav" },
      { name: "Clap", url: "5/hs_clap.wav" },
      { name: "Hat", url: "5/hs_hat.wav" },
      { name: "OHat", url: "5/hs_ohat.wav" },
      { name: "Perc", url: "5/hs_perc.wav" },
      { name: "Crash", url: "5/hs_crash.wav" },
    ],
    params: {
      attacks: [0, 20, 0, 0, 4, 0, 0, 0],
      releases: [49, 63, 42, 36, 26, 100, 43, 100],
      filters: [50, 50, 54, 50, 50, 50, 55, 50],
      pans: [50, 70, 50, 50, 36, 50, 62, 50],
      volumes: [91, 77, 85, 79, 86, 90, 74, 88],
    },
  },
  {
    name: "tech_house",
    samples: [
      { name: "Kick", url: "2/paris_kick.wav" },
      { name: "Bass", url: "2/paris_bass.wav" },
      { name: "Snare", url: "2/paris_snare.wav" },
      { name: "Clap", url: "2/paris_clap.wav" },
      { name: "Hat", url: "2/paris_hat.wav" },
      { name: "OHat", url: "2/paris_ohat.wav" },
      { name: "Piano", url: "2/paris_p_E.wav" },
      { name: "Piano2", url: "2/paris_p_Abm.wav" },
    ],
    params: {
      attacks: [0, 20, 0, 0, 4, 0, 0, 0],
      releases: [49, 63, 42, 40, 43, 100, 79, 100],
      filters: [50, 50, 54, 50, 50, 50, 55, 50],
      pans: [50, 50, 50, 50, 50, 50, 35, 66],
      volumes: [83, 83, 85, 87, 70, 82, 80, 79],
    },
  },
  {
    name: "techno",
    samples: [
      { name: "Kick", url: "7/berlin_kick.wav" },
      { name: "Bass", url: "7/berlin_bass.wav" },
      { name: "Snare", url: "7/berlin_snare.wav" },
      { name: "Clap", url: "7/berlin_clap.wav" },
      { name: "Hat", url: "7/berlin_hat.wav" },
      { name: "OHat", url: "7/berlin_ohat.wav" },
      { name: "Synth", url: "7/berlin_stab.wav" },
      { name: "Synth2", url: "7/berlin_loop.wav" },
    ],
    params: {
      attacks: [0, 100, 0, 0, 4, 33, 0, 0],
      releases: [49, 19, 42, 40, 43, 12, 79, 100],
      filters: [50, 4, 54, 50, 50, 50, 55, 50],
      pans: [50, 50, 50, 50, 36, 62, 35, 66],
      volumes: [92, 90, 85, 78, 74, 73, 85, 88],
    },
  },
  {
    name: "indie",
    samples: [
      { name: "Kick", url: "9/kick_puffy.wav" },
      { name: "Tom", url: "9/tom_clonk.wav" },
      { name: "Snare", url: "9/snare_together.wav" },
      { name: "Clap", url: "9/clap_hectic.wav" },
      { name: "Hat", url: "9/hat_crisp.wav" },
      { name: "OHat", url: "9/ohat_thick.wav" },
      { name: "Perc", url: "9/perc_jungle.wav" },
      { name: "Crash", url: "9/crash_legend.wav" },
    ],
    params: {
      releases: [100, 100, 100, 43, 29, 100, 54, 100],
      pans: [50, 50, 50, 37, 50, 50, 50, 50],
      volumes: [96, 88, 98, 76, 84, 80, 92, 78],
    },
  },
  {
    name: "jungle",
    samples: [
      { name: "Kick", url: "8/indie_kick.wav" },
      { name: "Kick2", url: "8/indie_kick2.wav" },
      { name: "Snare", url: "8/indie_snare.wav" },
      { name: "Snare2", url: "8/indie_snare2.wav" },
      { name: "Hat", url: "8/indie_hat.wav" },
      { name: "OHat", url: "8/indie_ohat.wav" },
      { name: "Cymbal", url: "8/indie_cymbal.wav" },
      { name: "Crash", url: "8/indie_crash.wav" },
    ],
    params: {
      attacks: [0, 0, 0, 0, 0, 0, 0, 15],
      releases: [31, 100, 100, 43, 29, 100, 54, 90],
      filters: [13, 55, 58, 50, 50, 50, 50, 26],
      pans: [50, 50, 50, 37, 50, 50, 33, 50],
      volumes: [94, 81, 95, 76, 84, 75, 92, 76],
    },
  },
];

// Main migration logic
const outputDir = path.join(__dirname, "..", "src", "lib", "kit", "bin");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Migrate each kit
for (const oldKit of kitsToMigrate) {
  const newKit = migrateKit(oldKit);
  const outputPath = path.join(outputDir, `${oldKit.name}.dhkit`);

  fs.writeFileSync(outputPath, JSON.stringify(newKit, null, 2) + "\n");
  console.log(`✓ Migrated ${oldKit.name} -> ${outputPath}`);
}

console.log("\n✓ All kits migrated successfully!");
