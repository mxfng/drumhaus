/**
 * Golden + inverse properties for the frozen split-filter curve.
 *
 * RETUNE POLICY: the frozen curve (frozen-split-filter.ts) is the PERMANENT
 * interpretation of a 0-100 split-filter position. It once duplicated the
 * widget's live curve, but the canonical flip retired that knob module and the
 * live curve now lives in the param-control filter descriptor with an
 * independent taper. Per the frozen-curve contract, this suite pins the frozen
 * values as literals and reimplements the frozen inverse locally - it must
 * NEVER be re-pointed at any live module. Old positions (v1/v1.5 knob values
 * and v2 documents) must keep converting with the curve their authors heard.
 */

import { describe, expect, it } from "vitest";

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import {
  FROZEN_SPLIT_FILTER_RANGE,
  frozenSplitFilterPositionToCanonical,
  SPLIT_FILTER_MAX_CUTOFF_HZ,
} from "./frozen-split-filter";

// Local inverse of the frozen curve (the retired transform.ts
// splitFilterToPosition), frozen here so the round-trip property cannot be
// re-pointed at a live module.
const FROZEN_THRESHOLD_L = 49;
const FROZEN_THRESHOLD_R = 50;
const FROZEN_CURVE_POWER = 2;

function frozenSplitFilterToPosition(filter: CanonicalFilter): number {
  const [min, max] = FROZEN_SPLIT_FILTER_RANGE;
  const normalized = (Math.max(min, filter.cutoffHz) - min) / (max - min);
  const t = Math.pow(normalized, 1 / FROZEN_CURVE_POWER);
  const position =
    filter.side === "highpass"
      ? FROZEN_THRESHOLD_R + t * FROZEN_THRESHOLD_L
      : t * FROZEN_THRESHOLD_L;
  return Math.min(100, Math.max(0, position));
}

const POSITIONS = Array.from({ length: 101 }, (_, i) => i);
const FRACTIONAL = [0.25, 7.5, 33.333, 66.6, 87.125, 99.5];

describe("frozen split-filter curve pins its authored values", () => {
  // Golden literals: the position -> { side, cutoffHz } the curve produced when
  // the filter became canonical. Independent of any live widget curve.
  it.each([
    [0, "lowpass", 0],
    [25, "lowpass", 3904.6230737],
    [49, "lowpass", 15000],
    [50, "highpass", 0],
    [75, "highpass", 3904.6230737],
    [100, "highpass", 15618.4922949],
  ] as const)(
    "position %f converts to the pinned value",
    (position, side, cutoffHz) => {
      const filter = frozenSplitFilterPositionToCanonical(position);
      expect(filter.side).toBe(side);
      expect(filter.cutoffHz).toBeCloseTo(cutoffHz, 6);
    },
  );
});

describe("frozen split-filter curve inverts through the frozen inverse", () => {
  // The (49, 50) dead zone is excluded: those positions sit between the two
  // open extremes and resolve to the 50+ side on the way back.
  it.each([...POSITIONS, ...FRACTIONAL])("recovers position %f", (position) => {
    expect(
      frozenSplitFilterToPosition(
        frozenSplitFilterPositionToCanonical(position),
      ),
    ).toBeCloseTo(position, 6);
  });

  it("maps the low-pass side to a lowpass filter and the high-pass side to highpass", () => {
    expect(frozenSplitFilterPositionToCanonical(0).side).toBe("lowpass");
    expect(frozenSplitFilterPositionToCanonical(49).side).toBe("lowpass");
    expect(frozenSplitFilterPositionToCanonical(50).side).toBe("highpass");
    expect(frozenSplitFilterPositionToCanonical(100).side).toBe("highpass");
  });

  it("puts both open extremes at 0 Hz / 15 kHz", () => {
    // Position 49 = low-pass fully open (range max); position 50 = high-pass
    // fully open (0 Hz).
    expect(frozenSplitFilterPositionToCanonical(49).cutoffHz).toBeCloseTo(
      15000,
      6,
    );
    expect(frozenSplitFilterPositionToCanonical(50).cutoffHz).toBe(0);
  });

  it("clamps out-of-range positions into [0, 100]", () => {
    expect(frozenSplitFilterPositionToCanonical(-5)).toEqual(
      frozenSplitFilterPositionToCanonical(0),
    );
    expect(frozenSplitFilterPositionToCanonical(150)).toEqual(
      frozenSplitFilterPositionToCanonical(100),
    );
  });
});

it("the frozen curve maximum is the HP-side overshoot of the 15 kHz range", () => {
  // 15000 * (50/49)^2, the closed-high-pass extreme at position 100 - the
  // same value pinned above at position 100.
  expect(SPLIT_FILTER_MAX_CUTOFF_HZ).toBeCloseTo(15618.49, 2);
});
