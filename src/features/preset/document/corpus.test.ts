import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { PresetFileV1 } from "@/features/preset/types/preset";
import { legacyCycleToChain } from "@/features/sequencer/lib/chain";
import {
  migrateInstruments,
  migrateMasterChainParams,
  migratePattern,
} from "@/features/sequencer/lib/migrations";
import { decodePresetObject } from "./decode";
import {
  CorruptFieldError,
  InvalidFileError,
  UnsupportedVersionError,
} from "./errors";
import { parsePresetFileV1 } from "./parse";

function readFixture(name: string): string {
  return readFileSync(
    new URL(`./__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

const ERA_FIXTURES = [
  "v1-current.json",
  "v1-legacy-params.json",
  "v1-legacy-master.json",
  "v1-legacy-cycle.json",
  "v1-legacy-pattern-array.json",
];

describe("historical corpus", () => {
  it.each(ERA_FIXTURES)(
    "%s parses as a v1 preset file, normalized to version 1.5",
    (name) => {
      const preset = parsePresetFileV1(readFixture(name));
      expect(preset.kind).toBe("drumhaus.preset");
      // validatePresetFileV1 normalizes v1 files to the current version
      // (the #269 swing retune bump); every fixture in this corpus has
      // swing 0, which migrates to 0.
      expect(preset.version).toBe(1.5);
      expect(preset.transport.swing).toBe(0);
    },
  );

  it.each(ERA_FIXTURES)("%s flows through today's migrators", (name) => {
    const preset = parsePresetFileV1(readFixture(name)) as PresetFileV1;

    const pattern = migratePattern(preset.sequencer.pattern);
    expect(pattern.voices.length).toBeGreaterThan(0);
    for (const voice of pattern.voices) {
      expect(voice.variations).toHaveLength(4);
      for (const variation of voice.variations) {
        expect(variation.triggers).toHaveLength(16);
        expect(variation.ratchets).toHaveLength(16);
        expect(variation.flams).toHaveLength(16);
      }
    }

    const instruments = migrateInstruments(preset.kit.instruments);
    for (const instrument of instruments) {
      expect(typeof instrument.params.decay).toBe("number");
      expect(typeof instrument.params.tune).toBe("number");
      expect(instrument.params).not.toHaveProperty("release");
      expect(instrument.params).not.toHaveProperty("pitch");
      expect(instrument.params).not.toHaveProperty("attack");
    }

    const master = migrateMasterChainParams(preset.masterChain);
    expect(typeof master.filter).toBe("number");
    expect(typeof master.saturation).toBe("number");
    expect(typeof master.compAttack).toBe("number");

    const legacyCycle = legacyCycleToChain(preset.sequencer.variationCycle, 0);
    const chain = preset.sequencer.chain ?? legacyCycle.chain;
    expect(chain).toBeDefined();
  });

  // The earliest era (78fe632b, 2025-11-18 only) spelled the key "hiPass";
  // migrateMasterChainParams only reads "highPass", so a nonzero hiPass is
  // silently treated as 0. This pins the current behavior; closing the gap
  // is a v2 migration concern (docs/preset-persistence.md, PR 2).
  it("nonzero legacy hiPass is currently ignored by the master migrator", () => {
    const migrated = migrateMasterChainParams({ lowPass: 100, hiPass: 30 });
    // lowPass 100 maps to the neutral center (50); an honored hiPass of 30
    // would instead select high-pass mode and yield 65.
    expect(migrated.filter).toBe(50);
  });
});

/**
 * The document-era corpus: real, git-mined `.dh` documents captured on disk so
 * the multi-version read path (decodePresetObject) is pinned against actual
 * emitted bytes, not against the live v1-migration's output (which the
 * synthetic migrate-v2.test.ts fixtures track). Both files are the "Super
 * Dream Haus" factory preset - chosen over `init` because its per-channel
 * filter positions span both the low-pass and high-pass sides, so the v2 ->
 * v2.1 filter conversion is meaningfully exercised rather than pinned at a
 * single position. Provenance is in __fixtures__/README.md.
 */

/**
 * The eight channel filter positions in v2-super-dream-haus.json, and the
 * master position, with the canonical `{ side, cutoffHz }` each must migrate
 * to under the FROZEN split-filter curve. These are pinned literals (the frozen
 * curve is permanent), not values read back from the code under test.
 */
const EXPECTED_CHANNEL_FILTERS = [
  { position: 13, side: "lowpass", cutoffHz: 1055.8100791336944 },
  { position: 54, side: "highpass", cutoffHz: 99.95835068721368 },
  { position: 53, side: "highpass", cutoffHz: 56.226572261557685 },
  { position: 37, side: "lowpass", cutoffHz: 8552.686380674717 },
  { position: 58, side: "highpass", cutoffHz: 399.8334027488547 },
  { position: 39, side: "lowpass", cutoffHz: 9502.290712203247 },
  { position: 65, side: "highpass", cutoffHz: 1405.6643065389421 },
  { position: 26, side: "lowpass", cutoffHz: 4223.240316534778 },
] as const;
const EXPECTED_MASTER_FILTER = {
  position: 51,
  side: "highpass",
  cutoffHz: 6.247396917950855,
} as const;

describe("document corpus (v2 -> v2.1)", () => {
  it("v2-super-dream-haus.json decodes to a pinned v2.1 document", () => {
    const document = decodePresetObject(
      JSON.parse(readFixture("v2-super-dream-haus.json")),
    );

    // Envelope: the version-2 domain document migrates to the current 2.1.
    expect(document.kind).toBe("drumhaus.preset");
    expect(document.version).toBe(2.1);
    expect(document.meta.id).toBe("cf0a9d3b-841d-4eeb-9a54-0003afa037b3");
    expect(document.meta.name).toBe("Super Dream Haus");
    expect(document.kit.id).toBe("kit-11");

    // The load-bearing migration: each 0-100 filter position becomes the
    // canonical `{ side, cutoffHz }` under the frozen curve.
    document.channels.forEach((channel, index) => {
      const expected = EXPECTED_CHANNEL_FILTERS[index];
      expect(channel.filter.side).toBe(expected.side);
      expect(channel.filter.cutoffHz).toBeCloseTo(expected.cutoffHz, 9);
    });
    expect(document.master.filter.side).toBe(EXPECTED_MASTER_FILTER.side);
    expect(document.master.filter.cutoffHz).toBeCloseTo(
      EXPECTED_MASTER_FILTER.cutoffHz,
      9,
    );

    // Non-filter domain fields pass through v2 -> v2.1 untouched; pinned so a
    // drift in the captured document is caught, not silently absorbed.
    expect(document.channels.map((c) => c.volumeDb)).toEqual([
      1, 0, 0, 3, -3, -1, -0.5, 0,
    ]);
    expect(document.channels[3].pan).toBe(-0.26);
    expect(document.channels[1].tuneSemitones).toBeCloseTo(-0.5833333333, 9);
    expect(document.transport).toEqual({ bpm: 160, swing: 0 });
    expect(document.playback.chainEnabled).toBe(true);
    expect(document.playback.chain.steps).toEqual([
      { variation: 0, repeats: 3 },
      { variation: 1, repeats: 1 },
    ]);
    expect(document.master.saturation).toBe(0);
    expect(document.master.phaser).toBe(0.06);
    expect(document.master.reverb).toBe(0.24);
    expect(document.master.compThresholdDb).toBe(-20);
    expect(document.master.compRatio).toBe(4);
    expect(document.master.compMix).toBe(0.73);
    expect(document.master.masterVolumeDb).toBe(2);
  });

  it("v2_1-super-dream-haus.json is the captured 2.1 target, read strictly", () => {
    // The 2.1 fixture parses through the strict v2.1 schema (no migration) and
    // is byte-for-byte the document the v2 fixture migrates to, proving the two
    // captures are a coherent pair.
    const captured = decodePresetObject(
      JSON.parse(readFixture("v2_1-super-dream-haus.json")),
    );
    expect(captured.version).toBe(2.1);
    expect(captured.master.filter.side).toBe(EXPECTED_MASTER_FILTER.side);
    expect(captured.master.filter.cutoffHz).toBeCloseTo(
      EXPECTED_MASTER_FILTER.cutoffHz,
      9,
    );

    const migrated = decodePresetObject(
      JSON.parse(readFixture("v2-super-dream-haus.json")),
    );
    expect(captured).toEqual(migrated);
  });
});

describe("corrupt corpus", () => {
  it("wrong-kind.json fails as an invalid file", () => {
    expect(() => parsePresetFileV1(readFixture("wrong-kind.json"))).toThrow(
      InvalidFileError,
    );
  });

  it("unsupported-version.json fails as an unsupported version", () => {
    expect(() =>
      parsePresetFileV1(readFixture("unsupported-version.json")),
    ).toThrow(UnsupportedVersionError);
  });

  it("missing-sequencer.json fails on the sequencer path", () => {
    try {
      parsePresetFileV1(readFixture("missing-sequencer.json"));
      expect.unreachable("expected a CorruptFieldError");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe("sequencer");
    }
  });

  it("malformed-pattern.json fails on the pattern voices path", () => {
    try {
      parsePresetFileV1(readFixture("malformed-pattern.json"));
      expect.unreachable("expected a CorruptFieldError");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe(
        "sequencer.pattern.voices",
      );
    }
  });
});
