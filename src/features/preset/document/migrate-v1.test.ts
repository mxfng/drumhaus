import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  instrumentKnobsToContinuousParams,
  mapParamsToSettings,
  transportSwingKnobToDomain,
} from "@/core/audio/bridge/knob-to-domain";
import { INSTRUMENT_TUNE_BASE_FREQUENCY } from "@/core/audio/engine/constants";
import {
  instrumentDecayMapping,
  instrumentPanMapping,
  instrumentVolumeMapping,
  tuneMapping,
} from "@/shared/knob/lib/mapping";
import { UnknownKitError } from "./errors";
import { frozenV1Curves, migrateV1ToDocument } from "./migrate-v1";
import { GOLDEN_SURFACES } from "./migrate-v1.golden";
import { parsePresetFileV1, validatePresetFileV1 } from "./parse";

function readFixture(name: string): string {
  return readFileSync(
    new URL(`./__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

function migrateFixture(name: string) {
  return migrateV1ToDocument(parsePresetFileV1(readFixture(name)));
}

/** A mutable copy of the modern fixture for building synthetic v1 files. */
function rawCurrentFixture(): Record<string, unknown> {
  return JSON.parse(readFixture("v1-current.json")) as Record<string, unknown>;
}

function migrateRaw(raw: Record<string, unknown>) {
  return migrateV1ToDocument(validatePresetFileV1(raw));
}

const ERA_FIXTURES = [
  "v1-current.json",
  "v1-legacy-params.json",
  "v1-legacy-master.json",
  "v1-legacy-cycle.json",
  "v1-legacy-pattern-array.json",
];

const KNOB_VALUES = Array.from({ length: 101 }, (_, i) => i);
const EPSILON = 1e-9;

// RETUNE POLICY: this suite asserts the migration's frozen v1 curves equal
// the app's live bridge mappings, which is true today by construction. If it
// ever fails because the live curves were deliberately retuned, update THIS
// TEST to pin the frozen values as literals - never "fix" migrate-v1.ts to
// track the new curves. Decision 11 (docs/preset-persistence.md): v1 files
// are permanently interpreted with the curves their authors heard.
describe("frozen v1 curves match the live bridge mappings", () => {
  it.each(KNOB_VALUES)("channel conversions at knob %i", (knob) => {
    expect(
      Math.abs(
        frozenV1Curves.decaySeconds(knob) -
          instrumentDecayMapping.knobToDomain(knob),
      ),
    ).toBeLessThanOrEqual(EPSILON);

    const liveVolume = instrumentVolumeMapping.knobToDomain(knob);
    const frozenVolume = frozenV1Curves.volumeDb(knob);
    if (knob === 0) {
      // null is the document's JSON-safe spelling of the live -Infinity.
      expect(liveVolume).toBe(-Infinity);
      expect(frozenVolume).toBeNull();
    } else {
      expect(
        Math.abs((frozenVolume as number) - liveVolume),
      ).toBeLessThanOrEqual(EPSILON);
    }

    expect(
      Math.abs(
        frozenV1Curves.pan(knob) - instrumentPanMapping.knobToDomain(knob),
      ),
    ).toBeLessThanOrEqual(EPSILON);

    // The live tune mapping emits Hz; the document stores the semitone
    // offset, so compare through the equal-temperament identity.
    const frozenHz =
      INSTRUMENT_TUNE_BASE_FREQUENCY *
      Math.pow(2, frozenV1Curves.tuneSemitones(knob) / 12);
    expect(
      Math.abs(frozenHz - tuneMapping.knobToDomain(knob)),
    ).toBeLessThanOrEqual(EPSILON);

    // The split-filter position converts to the same canonical
    // { side, cutoffHz } as the live bridge.
    const continuous = instrumentKnobsToContinuousParams({
      decay: knob,
      filter: knob,
      volume: knob,
      pan: knob,
      tune: knob,
      solo: false,
      mute: false,
    });
    expect(frozenV1Curves.filter(knob)).toEqual(continuous.filter);
  });

  it.each(KNOB_VALUES)("master conversions at knob %i", (knob) => {
    const settings = mapParamsToSettings({
      filter: knob,
      saturation: knob,
      phaser: knob,
      reverb: knob,
      compThreshold: knob,
      compRatio: knob,
      compAttack: knob,
      compMix: knob,
      masterVolume: knob,
    });

    expect(frozenV1Curves.filter(knob)).toEqual(settings.filter);
    // The macro amount is the wet fraction; the companion fields
    // (saturationAmount, reverbDecay) are the engine-side recipe and are
    // deliberately not stored in the document (decision 15).
    expect(
      Math.abs(frozenV1Curves.saturation(knob) - settings.saturationWet),
    ).toBeLessThanOrEqual(EPSILON);
    expect(
      Math.abs(frozenV1Curves.phaser(knob) - settings.phaserWet),
    ).toBeLessThanOrEqual(EPSILON);
    expect(
      Math.abs(frozenV1Curves.reverb(knob) - settings.reverbWet),
    ).toBeLessThanOrEqual(EPSILON);
    expect(
      Math.abs(frozenV1Curves.compThresholdDb(knob) - settings.compThreshold),
    ).toBeLessThanOrEqual(EPSILON);
    expect(frozenV1Curves.compRatio(knob)).toBe(settings.compRatio);
    expect(
      Math.abs(frozenV1Curves.compAttackSeconds(knob) - settings.compAttack),
    ).toBeLessThanOrEqual(EPSILON);
    expect(
      Math.abs(frozenV1Curves.compMix(knob) - settings.compMix),
    ).toBeLessThanOrEqual(EPSILON);

    const frozenMasterVolume = frozenV1Curves.masterVolumeDb(knob);
    if (knob === 0) {
      expect(settings.masterVolume).toBe(-Infinity);
      expect(frozenMasterVolume).toBeNull();
    } else {
      expect(
        Math.abs((frozenMasterVolume as number) - settings.masterVolume),
      ).toBeLessThanOrEqual(EPSILON);
    }

    expect(
      Math.abs(
        frozenV1Curves.swingFraction(knob) - transportSwingKnobToDomain(knob),
      ),
    ).toBeLessThanOrEqual(EPSILON);
  });
});

describe("golden corpus", () => {
  // Pattern is excluded from the pinned surface: the migration reuses
  // migratePattern verbatim, and pattern integrity is covered by
  // corpus.test.ts and the migrate -> toV1 -> migrate round-trip.
  it.each(ERA_FIXTURES)(
    "%s migrates to the pinned document surface",
    (name) => {
      const { pattern: _pattern, ...surface } = migrateFixture(name);
      expect(surface).toEqual(GOLDEN_SURFACES[name]);
    },
  );

  // Hand-verified anchors so the pinned surfaces are not self-fulfilling. All
  // fixtures are the init preset, so the interesting values are the knob
  // defaults under the frozen curves: decay 100 -> 5s, volume 92 -> 0 dB,
  // pan/tune 50 -> center, compRatio knob 400/7 -> 5, swing 0 -> 0.

  it("v1-current spot values", () => {
    const document = migrateFixture("v1-current.json");
    expect(document.kind).toBe("drumhaus.preset");
    expect(document.version).toBe(2.1);
    expect(document.meta.id).toBe("53b9eebd-6af5-43ed-b43e-eec354dbc4cc");
    expect(document.meta.name).toBe("init");
    expect(document.kit.id).toBe("kit-0");
    expect(document.transport.bpm).toBe(100);
    expect(document.transport.swing).toBe(0);

    const channel = document.channels[0];
    expect(channel.decaySeconds).toBe(5); // knob 100, exponential [0.005, 5]
    // knob 50 is the high-pass open extreme: high-pass at 0 Hz.
    expect(channel.filter).toEqual({ side: "highpass", cutoffHz: 0 });
    expect(channel.volumeDb).toBeCloseTo(0, 9); // knob 92, linear [-46, 4]
    expect(channel.pan).toBe(0); // knob 50, linear [-1, 1]
    expect(channel.tuneSemitones).toBe(0); // knob 50 = center
    expect(channel.mute).toBe(false);
    expect(channel.solo).toBe(false);

    expect(document.master.filter).toEqual({ side: "highpass", cutoffHz: 0 });
    expect(document.master.saturation).toBe(0);
    expect(document.master.compRatio).toBe(5); // knob 57.142857... -> 5:1
    expect(document.master.compThresholdDb).toBe(0); // knob 100, linear [-40, 0]
    expect(document.master.compAttackSeconds).toBeCloseTo(0.02575, 9); // knob 50
    expect(document.master.compMix).toBeCloseTo(0.7, 9); // knob 70
    expect(document.master.masterVolumeDb).toBeCloseTo(0, 9); // knob 92

    expect(document.playback.chain.steps).toEqual([
      { variation: 0, repeats: 1 },
    ]);
    expect(document.playback.chainEnabled).toBe(false);
  });

  it("v1-legacy-params spot values", () => {
    const document = migrateFixture("v1-legacy-params.json");
    // "kit-drumhaus" is the pre-registry id of today's kit-0 (sonic content
    // verified identical across the rename).
    expect(document.kit.id).toBe("kit-0");
    expect(document.transport.bpm).toBe(100);

    // Legacy names: release 100 -> decay, pitch 50 -> tune.
    const channel = document.channels[0];
    expect(channel.decaySeconds).toBe(5);
    expect(channel.tuneSemitones).toBe(0);
    expect(channel.volumeDb).toBeCloseTo(0, 9);

    // Legacy master: lowPass 100 / highPass 0 -> neutral filter center (knob
    // 50 = high-pass open at 0 Hz); saturation and compAttack take migration
    // defaults (0 and knob 50).
    expect(document.master.filter).toEqual({ side: "highpass", cutoffHz: 0 });
    expect(document.master.saturation).toBe(0);
    expect(document.master.compAttackSeconds).toBeCloseTo(0.02575, 9);
    expect(document.master.compRatio).toBe(4); // knob 43 -> round(4.01)

    // variationCycle "A" degenerates to the default single-step chain.
    expect(document.playback.chain.steps).toEqual([
      { variation: 0, repeats: 1 },
    ]);
    expect(document.playback.chainEnabled).toBe(false);
  });

  it("v1-legacy-master spot values", () => {
    const document = migrateFixture("v1-legacy-master.json");
    expect(document.kit.id).toBe("kit-0");
    // lowPass 100 -> center (knob 50 = high-pass open at 0 Hz).
    expect(document.master.filter).toEqual({ side: "highpass", cutoffHz: 0 });
    expect(document.master.saturation).toBe(0);
    expect(document.master.compRatio).toBe(4); // knob 43
    // Params were already modern in this mixed-era file.
    expect(document.channels[0].decaySeconds).toBe(5);
    expect(document.playback.chainEnabled).toBe(false);
  });

  it("v1-legacy-cycle spot values", () => {
    const document = migrateFixture("v1-legacy-cycle.json");
    expect(document.kit.id).toBe("kit-0");
    // variationCycle "AB" -> two-step chain with chaining enabled.
    expect(document.playback.chain.steps).toEqual([
      { variation: 0, repeats: 1 },
      { variation: 1, repeats: 1 },
    ]);
    expect(document.playback.chainEnabled).toBe(true);
    expect(document.master.compRatio).toBe(5); // modern master, knob 400/7
  });

  it("v1-legacy-pattern-array spot values", () => {
    const document = migrateFixture("v1-legacy-pattern-array.json");
    expect(document.kit.id).toBe("kit-0");
    // Bare Voice[] pattern with 2 variations per voice fills out to 4.
    expect(document.pattern.voices).toHaveLength(8);
    for (const voice of document.pattern.voices) {
      expect(voice.variations).toHaveLength(4);
      for (const variation of voice.variations) {
        expect(variation.timingNudge).toBe(0);
        expect(variation.ratchets).toEqual(Array(16).fill(false));
        expect(variation.flams).toEqual(Array(16).fill(false));
      }
    }
    // hiPass 0 stays center (knob 50 = high-pass open); missing compMix
    // defaults to knob 70.
    expect(document.master.filter).toEqual({ side: "highpass", cutoffHz: 0 });
    expect(document.master.compMix).toBeCloseTo(0.7, 9);
    expect(document.channels[0].decaySeconds).toBe(5); // legacy release 100
  });
});

describe("hiPass behavior fix", () => {
  // The earliest era (2025-11-18 to 2025-11-20) spelled the high-pass knob
  // "hiPass". Today's loader silently drops it (corpus.test.ts pins that);
  // the v2 migration deliberately honors it as highPass instead.
  it("honors a nonzero legacy hiPass as highPass", () => {
    const raw = rawCurrentFixture();
    raw.masterChain = { lowPass: 100, hiPass: 30 };
    const document = migrateRaw(raw);
    // highPass 30 selects high-pass mode at position 50 + round(30 / 2) = 65,
    // which the frozen curve maps to a high-pass cutoff of ~1405.66 Hz.
    expect(document.master.filter.side).toBe("highpass");
    expect(document.master.filter.cutoffHz).toBeCloseTo(1405.664, 3);

    const rawHighPass = rawCurrentFixture();
    rawHighPass.masterChain = { lowPass: 100, highPass: 30 };
    expect(document.master.filter).toEqual(
      migrateRaw(rawHighPass).master.filter,
    );
  });

  it("does not let hiPass shadow a modern filter or a spelled-out highPass", () => {
    const raw = rawCurrentFixture();
    raw.masterChain = { filter: 20, hiPass: 30 };
    // Position 20 is on the low-pass side (~2498.96 Hz cutoff).
    const modern = migrateRaw(raw).master.filter;
    expect(modern.side).toBe("lowpass");
    expect(modern.cutoffHz).toBeCloseTo(2498.959, 3);

    const rawBoth = rawCurrentFixture();
    rawBoth.masterChain = { lowPass: 100, highPass: 0, hiPass: 30 };
    // Position 50 = high-pass open at 0 Hz.
    expect(migrateRaw(rawBoth).master.filter).toEqual({
      side: "highpass",
      cutoffHz: 0,
    });
  });
});

describe("kit dereference", () => {
  it("throws UnknownKitError for an unknown kit id", () => {
    const raw = rawCurrentFixture();
    (raw.kit as Record<string, unknown>).meta = { id: "kit-999", name: "?" };
    try {
      migrateRaw(raw);
      expect.unreachable("expected an UnknownKitError");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownKitError);
      expect((error as UnknownKitError).code).toBe("unknown-kit");
      expect((error as UnknownKitError).kitId).toBe("kit-999");
    }
  });

  it("throws UnknownKitError when the kit meta id is missing", () => {
    const raw = rawCurrentFixture();
    (raw.kit as Record<string, unknown>).meta = { name: "no id" };
    try {
      migrateRaw(raw);
      expect.unreachable("expected an UnknownKitError");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownKitError);
      expect((error as UnknownKitError).kitId).toBeUndefined();
    }
  });

  it("throws UnknownKitError for the retired kit-techno (content replaced)", () => {
    const raw = rawCurrentFixture();
    (raw.kit as Record<string, unknown>).meta = {
      id: "kit-techno",
      name: "Techno",
    };
    expect(() => migrateRaw(raw)).toThrow(UnknownKitError);
  });
});

describe("meta normalization", () => {
  it("substitutes the sentinel for non-string timestamps and drops a non-string author", () => {
    const raw = rawCurrentFixture();
    raw.meta = {
      id: "id-1",
      name: "weird meta",
      createdAt: 1234567890,
      author: 42,
    };
    const document = migrateRaw(raw);
    expect(document.meta.createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(document.meta.updatedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(document.meta.author).toBeUndefined();
  });

  it("passes a string author through", () => {
    const raw = rawCurrentFixture();
    (raw.meta as Record<string, unknown>).author = "Max Fung";
    expect(migrateRaw(raw).meta.author).toBe("Max Fung");
  });
});

describe("schema enforcement", () => {
  it("fails loudly when the migrated result violates the document schema", () => {
    const raw = rawCurrentFixture();
    const sequencer = raw.sequencer as {
      pattern: { voices: { variations: { velocities: number[] }[] }[] };
    };
    sequencer.pattern.voices[0].variations[0].velocities[0] = 2;
    expect(() => migrateRaw(raw)).toThrow(ZodError);
  });
});
