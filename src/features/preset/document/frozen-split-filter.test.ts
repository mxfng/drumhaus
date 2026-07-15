/**
 * Parity + inverse properties for the frozen split-filter curve.
 *
 * RETUNE POLICY: this suite asserts the FROZEN curve equals the widget's LIVE
 * split-filter curve, which is true today by construction. If it ever fails
 * because the live curve was deliberately retuned, update THIS TEST to pin
 * the frozen values as literals - never re-point frozen-split-filter.ts at
 * the live module. Old positions (v1/v1.5 knob values and v2 documents) must
 * keep converting with the curve their authors heard.
 */

import { describe, expect, it } from "vitest";

import {
  splitFilterPositionToFilter,
  splitFilterToPosition,
} from "@/shared/knob/lib/transform";
import { frozenSplitFilterPositionToCanonical } from "./frozen-split-filter";

const POSITIONS = Array.from({ length: 101 }, (_, i) => i);
const FRACTIONAL = [0.25, 7.5, 33.333, 66.6, 87.125, 99.5];

describe("frozen split-filter curve matches the live widget curve", () => {
  it.each([...POSITIONS, ...FRACTIONAL])(
    "position %f converts identically",
    (position) => {
      expect(frozenSplitFilterPositionToCanonical(position)).toEqual(
        splitFilterPositionToFilter(position),
      );
    },
  );
});

describe("frozen split-filter curve inverts through splitFilterToPosition", () => {
  // The (49, 50) dead zone is excluded: those positions sit between the two
  // open extremes and resolve to the 50+ side on the way back (see
  // domain-to-knob.test.ts).
  it.each([...POSITIONS, 0.25, 7.5, 33.333, 66.6, 87.125, 99.5])(
    "recovers position %f",
    (position) => {
      expect(
        splitFilterToPosition(frozenSplitFilterPositionToCanonical(position)),
      ).toBeCloseTo(position, 6);
    },
  );

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
