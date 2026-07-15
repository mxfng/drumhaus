import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { PresetFileV1 } from "@/features/preset/types/preset";
import { legacyCycleToChain } from "@/features/sequencer/lib/chain";
import {
  migrateInstruments,
  migrateMasterChainParams,
  migratePattern,
} from "@/features/sequencer/lib/migrations";
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
