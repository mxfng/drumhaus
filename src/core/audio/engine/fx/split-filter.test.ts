/**
 * Byte-identity guard for the split-filter node derivation.
 *
 * `deriveSplitFilterFrequencies` turns a canonical `{ side, cutoffHz }` value
 * into the two Tone `Filter` node cutoffs, and it is the single surface where a
 * wrong LP/HP target, a bad bypass floor, or a swapped range max would change
 * the rendered sound while passing every default-position golden render. These
 * cases pin the derivation at the LP/HP extremes and one mid value for BOTH the
 * instrument and master call sites (both ranges are [0, 15000] Hz).
 */

import { describe, expect, it } from "vitest";

import {
  INSTRUMENT_FILTER_RANGE,
  MASTER_FILTER_RANGE,
  SPLIT_FILTER_BYPASS_FLOOR_HZ,
} from "../constants";
import {
  deriveSplitFilterFrequencies,
  type SplitFilterConfig,
} from "./split-filter";

// The frozen curve's HP-side overshoot of the 15 kHz range (15000 *
// (50/49)^2), an out-of-range Hz value above the live [0, 15000] range this
// module derives from. Inlined rather than imported from the legacy-read
// island (frozen-split-filter.ts): this engine module must never depend on
// that island, and the curve's own literal is pinned there
// (frozen-split-filter.test.ts).
const OUT_OF_RANGE_CUTOFF_HZ = 15618.4922949;

// Configs built exactly as the two call sites build them (instrument-channel.ts
// and master-bus.ts): the range endpoints, no explicit bypass floor.
const INSTRUMENT_CONFIG: SplitFilterConfig = {
  minFrequency: INSTRUMENT_FILTER_RANGE[0],
  maxFrequency: INSTRUMENT_FILTER_RANGE[1],
};
const MASTER_CONFIG: SplitFilterConfig = {
  minFrequency: MASTER_FILTER_RANGE[0],
  maxFrequency: MASTER_FILTER_RANGE[1],
};

describe.each([
  ["instrument", INSTRUMENT_CONFIG],
  ["master", MASTER_CONFIG],
])("deriveSplitFilterFrequencies (%s range)", (_label, config) => {
  const rangeMax = config.maxFrequency;

  it("deep low-pass: LP tracks 0 Hz, HP opens to the bypass floor", () => {
    expect(
      deriveSplitFilterFrequencies({ side: "lowpass", cutoffHz: 0 }, config),
    ).toEqual({
      lowPassTarget: 0,
      highPassTarget: SPLIT_FILTER_BYPASS_FLOOR_HZ,
    });
  });

  it("mid low-pass: LP tracks the cutoff, HP stays at the bypass floor", () => {
    expect(
      deriveSplitFilterFrequencies({ side: "lowpass", cutoffHz: 7500 }, config),
    ).toEqual({
      lowPassTarget: 7500,
      highPassTarget: SPLIT_FILTER_BYPASS_FLOOR_HZ,
    });
  });

  it("open low-pass: LP tracks the range max, HP stays at the bypass floor", () => {
    expect(
      deriveSplitFilterFrequencies(
        { side: "lowpass", cutoffHz: rangeMax },
        config,
      ),
    ).toEqual({
      lowPassTarget: rangeMax,
      highPassTarget: SPLIT_FILTER_BYPASS_FLOOR_HZ,
    });
  });

  it("open high-pass: LP opens to the range max, HP tracks 0 Hz", () => {
    expect(
      deriveSplitFilterFrequencies({ side: "highpass", cutoffHz: 0 }, config),
    ).toEqual({
      lowPassTarget: rangeMax,
      highPassTarget: 0,
    });
  });

  it("mid high-pass: LP opens to the range max, HP tracks the cutoff", () => {
    expect(
      deriveSplitFilterFrequencies(
        { side: "highpass", cutoffHz: 7500 },
        config,
      ),
    ).toEqual({
      lowPassTarget: rangeMax,
      highPassTarget: 7500,
    });
  });

  it("deep high-pass: LP opens to the range max, HP tracks an out-of-range cutoff unclamped", () => {
    expect(
      deriveSplitFilterFrequencies(
        { side: "highpass", cutoffHz: OUT_OF_RANGE_CUTOFF_HZ },
        config,
      ),
    ).toEqual({
      lowPassTarget: rangeMax,
      highPassTarget: OUT_OF_RANGE_CUTOFF_HZ,
    });
  });
});

it("the bypass floor stays at 10 Hz so the HP node never clamps to 0 Hz", () => {
  expect(SPLIT_FILTER_BYPASS_FLOOR_HZ).toBe(10);
});
