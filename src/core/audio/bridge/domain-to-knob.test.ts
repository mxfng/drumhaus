/**
 * Round-trip properties for the domain-to-knob inverse mappings against
 * the forward knob-to-domain boundary layer.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import type { MasterChainSettings } from "@/core/audio/engine/master-bus";
import type { InstrumentParams } from "@/features/instrument/types/instrument";
import { compRatioMapping, tuneMapping } from "@/shared/knob/lib/mapping";
import { splitFilterPositionToFilter } from "@/shared/knob/lib/transform";
import {
  compRatioDomainToKnob,
  continuousParamsToInstrumentKnobs,
  instrumentVolumeDomainToKnob,
  mapSettingsToParams,
  masterVolumeDomainToKnob,
  playParamsToInstrumentKnobs,
  splitFilterToKnobPosition,
  transportSwingDomainToKnob,
  tuneDomainToKnob,
} from "./domain-to-knob";
import {
  instrumentKnobsToContinuousParams,
  instrumentKnobsToPlayParams,
  mapParamsToSettings,
  transportSwingKnobToDomain,
  type MasterChainParams,
} from "./knob-to-domain";

const INTEGER_KNOB_VALUES = Array.from({ length: 101 }, (_, i) => i);
const FRACTIONAL_KNOB_VALUES = [0.25, 7.5, 33.333, 49.999, 66.6, 87.125, 99.5];
const KNOB_VALUES = [...INTEGER_KNOB_VALUES, ...FRACTIONAL_KNOB_VALUES];

const EPSILON = 1e-6;

function makeInstrumentParams(knobValue: number): InstrumentParams {
  return {
    decay: knobValue,
    filter: knobValue,
    volume: knobValue,
    pan: knobValue,
    tune: knobValue,
    solo: false,
    mute: true,
  };
}

/** Snaps a compRatio knob value to the center of its ratio's interval. */
function compRatioCenterKnob(knobValue: number): number {
  return compRatioDomainToKnob(compRatioMapping.knobToDomain(knobValue));
}

function makeMasterChainParams(knobValue: number): MasterChainParams {
  return {
    filter: knobValue,
    saturation: knobValue,
    phaser: knobValue,
    reverb: knobValue,
    compThreshold: knobValue,
    compRatio: compRatioCenterKnob(knobValue),
    compAttack: knobValue,
    compMix: knobValue,
    masterVolume: knobValue,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("instrument param round-trips", () => {
  it.each(KNOB_VALUES)(
    "inverts continuous params (pan, volume) at knob %f",
    (knobValue) => {
      const knobs = continuousParamsToInstrumentKnobs(
        instrumentKnobsToContinuousParams(makeInstrumentParams(knobValue)),
      );
      expect(knobs.pan).toBeCloseTo(knobValue, 6);
      expect(knobs.volume).toBeCloseTo(knobValue, 6);
    },
  );

  it.each(KNOB_VALUES)(
    "inverts play params (tune, decay) at knob %f",
    (knobValue) => {
      const knobs = playParamsToInstrumentKnobs(
        instrumentKnobsToPlayParams(makeInstrumentParams(knobValue)),
      );
      expect(knobs.tune).toBeCloseTo(knobValue, 6);
      expect(knobs.decay).toBeCloseTo(knobValue, 6);
      expect(knobs.mute).toBe(true);
      expect(knobs.solo).toBe(false);
    },
  );
});

describe("tune", () => {
  it.each(KNOB_VALUES)(
    "round-trips knob %f through Hz without rounding",
    (knobValue) => {
      const knob = tuneDomainToKnob(tuneMapping.knobToDomain(knobValue));
      expect(Math.abs(knob - knobValue)).toBeLessThanOrEqual(EPSILON);
    },
  );
});

describe("volume knob 0 (-Infinity / null)", () => {
  it("inverts -Infinity to knob 0", () => {
    const continuous = instrumentKnobsToContinuousParams(
      makeInstrumentParams(0),
    );
    expect(continuous.volume).toBe(-Infinity);
    expect(instrumentVolumeDomainToKnob(continuous.volume)).toBe(0);
    expect(masterVolumeDomainToKnob(-Infinity)).toBe(0);
  });

  it("inverts null (the JSON spelling of -Infinity) to knob 0", () => {
    expect(instrumentVolumeDomainToKnob(null)).toBe(0);
    expect(masterVolumeDomainToKnob(null)).toBe(0);
  });
});

describe("compRatio", () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "forward(inverse(%i)) returns the ratio exactly",
    (ratio) => {
      expect(compRatioMapping.knobToDomain(compRatioDomainToKnob(ratio))).toBe(
        ratio,
      );
    },
  );
});

describe("split-filter round-trip (position -> canonical -> position)", () => {
  // Every valid position round-trips through the canonical { side, cutoffHz }
  // EXCEPT the (49, 50) dead zone: those positions sit between the low-pass
  // open extreme (49) and the high-pass open extreme (50) and map to tiny
  // high-pass cutoffs whose inverse resolves to the 50+ side. The dead zone
  // is inaudible (a near-open high-pass either way) and unreachable as a
  // meaningful knob setting.
  const ROUND_TRIP_POSITIONS = [
    ...INTEGER_KNOB_VALUES,
    0.25,
    7.5,
    33.333,
    66.6,
    87.125,
    99.5,
  ];

  it.each(ROUND_TRIP_POSITIONS)(
    "recovers position %f from its canonical filter",
    (position) => {
      expect(
        splitFilterToKnobPosition(splitFilterPositionToFilter(position)),
      ).toBeCloseTo(position, 6);
    },
  );

  it("maps the low-pass side (0-49) to a lowpass filter", () => {
    expect(splitFilterPositionToFilter(0).side).toBe("lowpass");
    expect(splitFilterPositionToFilter(49).side).toBe("lowpass");
  });

  it("maps the high-pass side (50-100) to a highpass filter", () => {
    expect(splitFilterPositionToFilter(50).side).toBe("highpass");
    expect(splitFilterPositionToFilter(100).side).toBe("highpass");
  });

  it("clamps out-of-range cutoffs into [0, 100]", () => {
    expect(splitFilterToKnobPosition({ side: "lowpass", cutoffHz: -5 })).toBe(
      0,
    );
    expect(
      splitFilterToKnobPosition({ side: "highpass", cutoffHz: 999999 }),
    ).toBe(100);
  });
});

describe("transport swing", () => {
  it.each(KNOB_VALUES)(
    "round-trips knob %f through the Tone swing domain",
    (knobValue) => {
      const knob = transportSwingDomainToKnob(
        transportSwingKnobToDomain(knobValue),
      );
      expect(Math.abs(knob - knobValue)).toBeLessThanOrEqual(EPSILON);
    },
  );

  // Pins the #269 retune: the knob maps linearly onto the TR-909 shuffle
  // range, so knob 100 = Tone swing 0.375 (MPC 62.5%) and knob 50 = 0.1875
  // (MPC 56.25%).
  it("maps knob 100 to Tone swing 0.375 (the 909 ceiling)", () => {
    expect(transportSwingKnobToDomain(100)).toBe(0.375);
  });

  it("maps knob 50 to Tone swing 0.1875", () => {
    expect(transportSwingKnobToDomain(50)).toBe(0.1875);
  });

  it("maps knob 0 to straight time", () => {
    expect(transportSwingKnobToDomain(0)).toBe(0);
  });
});

describe("mapSettingsToParams", () => {
  it.each([0, 0.25, 1, 25, 50, 70, 87.125, 92, 100])(
    "inverts mapParamsToSettings per field at knob %f",
    (knobValue) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const params = makeMasterChainParams(knobValue);
      const roundTripped = mapSettingsToParams(mapParamsToSettings(params));

      for (const key of Object.keys(params) as (keyof MasterChainParams)[]) {
        expect
          .soft(roundTripped[key], key)
          .toBeCloseTo(params[key] as number, 6);
      }
      // Forward-produced companion fields are consistent by construction.
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it("warns in dev when saturationAmount disagrees with the wet recipe", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const settings: MasterChainSettings = {
      ...mapParamsToSettings(makeMasterChainParams(50)),
      saturationWet: 0.5,
      saturationAmount: 0.2, // recipe says 0.125
    };
    mapSettingsToParams(settings);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("saturationAmount");
  });

  it("warns in dev when reverbDecay disagrees with the wet recipe", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const settings: MasterChainSettings = {
      ...mapParamsToSettings(makeMasterChainParams(50)),
      reverbWet: 0.5,
      reverbDecay: 1.5, // recipe says 0.8
    };
    mapSettingsToParams(settings);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("reverbDecay");
  });
});
