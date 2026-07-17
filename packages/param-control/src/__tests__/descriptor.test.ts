import { describe, expect, it } from "vitest";

import {
  canonicalToNormalized,
  clampValue,
  endpointValue,
  isDiscrete,
  normalizedToCanonical,
  parseValue,
  resetValue,
  stepValue,
} from "../lib/descriptor";
import type { ParamDescriptor } from "../types";

const linear = (
  min: number,
  max: number,
  extra: Partial<ParamDescriptor<number>> = {},
): ParamDescriptor<number> => ({
  min,
  max,
  taper: { kind: "linear" },
  default: min,
  format: (v) => String(v),
  ...extra,
});

describe("clamping", () => {
  const d = linear(-46, 4);

  it("clamps canonical values to [min, max]", () => {
    expect(clampValue(d, -100)).toBe(-46);
    expect(clampValue(d, 100)).toBe(4);
    expect(clampValue(d, -10)).toBe(-10);
  });

  it("clamps out-of-range positions at both ends", () => {
    expect(normalizedToCanonical(d, -1)).toBe(-46);
    expect(normalizedToCanonical(d, 2)).toBe(4);
  });
});

describe("interval quantization", () => {
  const ratio = linear(1, 8, { interval: 1, default: 4 });

  it("snaps to the interval grid offset from min", () => {
    expect(normalizedToCanonical(ratio, 0)).toBe(1);
    expect(normalizedToCanonical(ratio, 1)).toBe(8);
    // position ~0.3 -> raw 3.1 -> snaps to 3
    expect(normalizedToCanonical(ratio, 0.3)).toBe(3);
    // position ~0.55 -> raw 4.85 -> snaps to 5
    expect(normalizedToCanonical(ratio, 0.55)).toBe(5);
  });

  it("reports as discrete", () => {
    expect(isDiscrete(ratio)).toBe(true);
    expect(isDiscrete(linear(0, 1))).toBe(false);
  });
});

describe("stepCount quantization", () => {
  const stepped = linear(0, 100, { stepCount: 5 }); // positions 0,.25,.5,.75,1

  it("snaps the position onto the stepCount grid", () => {
    expect(normalizedToCanonical(stepped, 0.3)).toBe(25);
    expect(normalizedToCanonical(stepped, 0.4)).toBe(50);
    expect(normalizedToCanonical(stepped, 0.9)).toBe(100);
  });
});

describe("detent snapping", () => {
  const pan = linear(-1, 1, {
    default: 0,
    polarity: "bipolar",
    detents: [{ value: 0, radiusPct: 0.05 }],
  });

  it("snaps within the detent radius", () => {
    // position 0.52 is within 0.05 of centre (0.5) -> snaps to 0
    expect(normalizedToCanonical(pan, 0.52)).toBe(0);
  });

  it("does not snap outside the radius", () => {
    // position 0.6 is 0.1 from centre -> no snap
    expect(normalizedToCanonical(pan, 0.6)).toBeCloseTo(0.2, 9);
  });

  it("is auto-disabled under fine drag", () => {
    expect(normalizedToCanonical(pan, 0.52, { fine: true })).toBeCloseTo(
      0.04,
      9,
    );
  });
});

describe("keyboard step math", () => {
  it("continuous params step by keyStep in normalized space", () => {
    // volume: span 50 dB, default keyStep 0.01 -> 0.5 dB per arrow
    const vol = linear(-46, 4, { default: 0 });
    expect(stepValue(vol, 0, 1, false)).toBeCloseTo(0.5, 9);
    expect(stepValue(vol, 0, -1, false)).toBeCloseTo(-0.5, 9);
  });

  it("continuous params step by keyStepLarge on Page", () => {
    const vol = linear(-46, 4, { default: 0 });
    // span 50 dB, keyStepLarge default 0.1 -> 5 dB; start mid-range (-21 = pos 0.5)
    expect(stepValue(vol, -21, 1, true)).toBeCloseTo(-16, 9);
  });

  it("respects custom keyStep", () => {
    const d = linear(0, 100, { keyStep: 0.05 });
    expect(stepValue(d, 0, 1, false)).toBeCloseTo(5, 9);
  });

  it("discrete params step by one interval", () => {
    const ratio = linear(1, 8, { interval: 1, default: 4 });
    expect(stepValue(ratio, 4, 1, false)).toBe(5);
    expect(stepValue(ratio, 4, -1, false)).toBe(3);
  });

  it("discrete Page moves ten intervals, clamped", () => {
    const ratio = linear(1, 8, { interval: 1, default: 4 });
    expect(stepValue(ratio, 4, 1, true)).toBe(8);
    expect(stepValue(ratio, 4, -1, true)).toBe(1);
  });

  it("stepping bypasses detents so a step near centre still moves", () => {
    const pan = linear(-1, 1, {
      default: 0,
      detents: [{ value: 0, radiusPct: 0.2 }],
    });
    // from centre, one arrow moves off the detent instead of being swallowed
    expect(stepValue(pan, 0, 1, false)).toBeCloseTo(0.02, 9);
  });

  it("endpoints resolve to min and max", () => {
    const d = linear(-46, 4);
    expect(endpointValue(d, "min")).toBe(-46);
    expect(endpointValue(d, "max")).toBe(4);
  });
});

describe("reset", () => {
  it("returns the clamped default", () => {
    expect(resetValue(linear(-1, 1, { default: 0 }))).toBe(0);
    expect(resetValue(linear(-1, 1, { default: 5 }))).toBe(1);
  });
});

describe("parse rejects when unparseable or descriptor lacks parse", () => {
  it("returns null without a parse fn", () => {
    expect(parseValue(linear(0, 1), "0.5")).toBeNull();
  });

  it("clamps parsed values", () => {
    const d = linear(0, 1, { parse: (t) => Number(t) });
    expect(parseValue(d, "2")).toBe(1);
    expect(parseValue(d, "-2")).toBe(0);
  });
});

describe("position round-trip is identity for continuous params", () => {
  it("canonical -> position -> canonical", () => {
    const vol = linear(-46, 4, { default: 0 });
    for (const v of [-46, -30, -6, 0, 4]) {
      const pos = canonicalToNormalized(vol, v);
      expect(normalizedToCanonical(vol, pos)).toBeCloseTo(v, 9);
    }
  });
});
