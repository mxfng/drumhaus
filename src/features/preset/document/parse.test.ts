import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { init } from "@/core/dh";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import {
  CorruptFieldError,
  InvalidFileError,
  UnsupportedVersionError,
} from "./errors";
import { parsePresetFileV1, validatePresetFileV1 } from "./parse";

// --- Inline fixtures ---
// Deliberately not using __fixtures__/ (owned by the golden-corpus task);
// these are minimal handwritten shapes.

function makeStepSequence() {
  return {
    triggers: Array.from({ length: 16 }, () => false),
    velocities: Array.from({ length: 16 }, () => 1),
    timingNudge: 0,
    ratchets: Array.from({ length: 16 }, () => false),
    flams: Array.from({ length: 16 }, () => false),
  };
}

function makeVoice() {
  return {
    instrumentIndex: 0,
    variations: [
      makeStepSequence(),
      makeStepSequence(),
      makeStepSequence(),
      makeStepSequence(),
    ],
  };
}

function makeInstrument() {
  return {
    meta: { id: "inst-0", name: "Kick" },
    role: "kick",
    sample: {
      meta: { id: "sample-0", name: "Kick" },
      path: "kits/808/kick.wav",
    },
    params: {
      decay: 50,
      filter: 50,
      volume: 92,
      pan: 50,
      tune: 50,
      solo: false,
      mute: false,
    },
  };
}

function makePreset() {
  return {
    kind: "drumhaus.preset",
    version: 1,
    meta: {
      id: "preset-test",
      name: "Test Preset",
      createdAt: "2023-11-20T16:00:00.000Z",
      updatedAt: "2023-11-20T16:00:00.000Z",
    },
    kit: {
      kind: "drumhaus.kit",
      version: 1,
      meta: { id: "kit-0", name: "808" },
      instruments: [makeInstrument(), makeInstrument()],
    },
    transport: { bpm: 120, swing: 0 },
    sequencer: {
      pattern: {
        voices: [makeVoice()],
        variationMetadata: [
          { accent: Array.from({ length: 16 }, () => false) },
        ],
      },
      chain: { steps: [{ variation: 0, repeats: 1 }] },
      chainEnabled: false,
    },
    masterChain: {
      filter: 50,
      saturation: 0,
      phaser: 0,
      reverb: 0,
      compThreshold: 100,
      compRatio: 50,
      compAttack: 50,
      compMix: 70,
      masterVolume: 92,
    },
  };
}

/**
 * Every legacy variant the migrators tolerate at once: release/pitch/attack
 * instrument params, an array-shaped pattern (Voice[]), variationCycle
 * instead of chain, and lowPass/highPass master params.
 */
function makeLegacyPreset() {
  return {
    kind: "drumhaus.preset",
    version: 1,
    meta: { id: "preset-legacy", name: "Legacy Preset" },
    kit: {
      kind: "drumhaus.kit",
      version: 1,
      meta: { id: "kit-0", name: "808" },
      instruments: [
        {
          meta: { id: "inst-0", name: "Kick" },
          role: "kick",
          sample: {
            meta: { id: "sample-0", name: "Kick" },
            path: "kits/808/kick.wav",
          },
          params: {
            attack: 0,
            release: 60,
            pitch: 40,
            filter: 50,
            volume: 92,
            pan: 50,
          },
        },
      ],
    },
    transport: { bpm: 128, swing: 20 },
    sequencer: {
      // Legacy Pattern = Voice[], pre-nudge/ratchet/flam sequences
      pattern: [
        {
          instrumentIndex: 0,
          variations: [
            {
              triggers: Array.from({ length: 16 }, () => true),
              velocities: Array.from({ length: 16 }, () => 1),
            },
          ],
        },
      ],
      variationCycle: "AB",
    },
    masterChain: {
      lowPass: 80,
      highPass: 0,
      reverb: 10,
      compThreshold: 100,
      compRatio: 50,
      compMix: 70,
      masterVolume: 92,
    },
  };
}

describe("validatePresetFileV1", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses a minimal valid v1 preset, normalized to version 1.5", () => {
    const preset = makePreset();
    const parsed = validatePresetFileV1(preset);

    // The v1 -> v2 normalization only touches the version marker (swing 0
    // migrates to 0); everything else round-trips unchanged.
    expect(parsed).toEqual({ ...preset, version: 1.5 });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("parses a legacy-shaped preset the migrators accept", () => {
    const parsed = validatePresetFileV1(makeLegacyPreset());

    expect(parsed.meta.name).toBe("Legacy Preset");
    expect(Array.isArray(parsed.sequencer.pattern)).toBe(true);
    expect(parsed.sequencer.variationCycle).toBe("AB");
    // v1 swing knob 20 (old Tone swing 0.1) rescales by 4/3 (#269).
    expect(parsed.transport.swing).toBeCloseTo(80 / 3, 12);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("migrates v1 swing knob values into the retuned knob space (#269)", () => {
    const preset = makePreset();
    preset.transport.swing = 48;

    const parsed = validatePresetFileV1(preset);

    expect(parsed.version).toBe(1.5);
    expect(parsed.transport.swing).toBe(64);
  });

  it("clamps v1 swing values above 75 to knob 100 (#269)", () => {
    const preset = makePreset();
    preset.transport.swing = 90;

    const parsed = validatePresetFileV1(preset);

    expect(parsed.transport.swing).toBe(100);
  });

  it("passes version-1.5 presets through without touching swing", () => {
    const preset = { ...makePreset(), version: 1.5 };
    preset.transport.swing = 64;

    const parsed = validatePresetFileV1(preset);

    expect(parsed).toEqual(preset);
  });

  it("throws InvalidFileError for a non-object", () => {
    expect(() => validatePresetFileV1("not a preset")).toThrow(
      InvalidFileError,
    );
    expect(() => validatePresetFileV1(null)).toThrow(InvalidFileError);
  });

  it("throws InvalidFileError for the wrong kind", () => {
    const preset = { ...makePreset(), kind: "drumhaus.kit" };
    expect(() => validatePresetFileV1(preset)).toThrow(InvalidFileError);
  });

  it("throws UnsupportedVersionError carrying the found version", () => {
    const preset = { ...makePreset(), version: 2 };

    let error: unknown;
    try {
      validatePresetFileV1(preset);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(UnsupportedVersionError);
    expect((error as UnsupportedVersionError).version).toBe(2);
  });

  it("throws CorruptFieldError with path 'sequencer' when sequencer is missing", () => {
    const { sequencer: _sequencer, ...preset } = makePreset();

    let error: unknown;
    try {
      validatePresetFileV1(preset);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(CorruptFieldError);
    expect((error as CorruptFieldError).path).toBe("sequencer");
  });

  it("throws CorruptFieldError when pattern voices is a string", () => {
    const preset = makePreset();
    preset.sequencer.pattern = {
      voices: "corrupt",
    } as unknown as ReturnType<typeof makePreset>["sequencer"]["pattern"];

    let error: unknown;
    try {
      validatePresetFileV1(preset);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(CorruptFieldError);
    expect((error as CorruptFieldError).path).toBe("sequencer.pattern.voices");
  });

  it("strips unknown top-level keys and warns once", () => {
    const preset = { ...makePreset(), futureFeature: true };
    const parsed = validatePresetFileV1(preset);

    expect("futureFeature" in parsed).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("futureFeature");
  });

  it("rejects the canonical bundled defaults as an unsupported version", () => {
    // The bundled defaults are canonical v2.1 documents now, so the v1
    // validator must refuse them cleanly rather than mis-reading them.
    for (const preset of [...getDefaultPresets(), init()]) {
      expect(() => validatePresetFileV1(preset)).toThrow(
        UnsupportedVersionError,
      );
    }
  });
});

describe("parsePresetFileV1", () => {
  it("parses valid preset JSON text", () => {
    const parsed = parsePresetFileV1(JSON.stringify(makePreset()));
    expect(parsed.meta.id).toBe("preset-test");
  });

  it("throws InvalidFileError for invalid JSON text", () => {
    expect(() => parsePresetFileV1("{not json")).toThrow(InvalidFileError);
  });
});
