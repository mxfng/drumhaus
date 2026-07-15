import { describe, expect, it } from "vitest";

import {
  setSkewForCentre,
  taperFromNormalized,
  taperToNormalized,
} from "../lib/taper";
import type { Taper } from "../types";

const TOL = 1e-9;

/** Round-trip a set of positions through fromNormalized -> toNormalized. */
function expectPositionRoundTrip(taper: Taper, min: number, max: number) {
  for (const pos of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const value = taperFromNormalized(taper, pos, min, max);
    const back = taperToNormalized(taper, value, min, max);
    expect(back).toBeCloseTo(pos, 9);
  }
}

describe("linear taper", () => {
  const taper: Taper = { kind: "linear" };

  it("maps position to value proportionally", () => {
    expect(taperFromNormalized(taper, 0, -46, 4)).toBeCloseTo(-46, 9);
    expect(taperFromNormalized(taper, 1, -46, 4)).toBeCloseTo(4, 9);
    expect(taperFromNormalized(taper, 0.5, -46, 4)).toBeCloseTo(-21, 9);
  });

  it("round-trips", () => {
    expectPositionRoundTrip(taper, -46, 4);
  });
});

describe("exponential taper", () => {
  const taper: Taper = { kind: "exponential", skew: 0.5 };

  it("is monotonic and hits the endpoints", () => {
    expect(taperFromNormalized(taper, 0, 0.005, 5)).toBeCloseTo(0.005, 9);
    expect(taperFromNormalized(taper, 1, 0.005, 5)).toBeCloseTo(5, 9);
  });

  it("round-trips within tolerance", () => {
    expectPositionRoundTrip(taper, 0.005, 5);
    expectPositionRoundTrip({ kind: "exponential", skew: 0.23 }, 20, 20000);
  });
});

describe("symmetric skew (bipolar)", () => {
  const taper: Taper = { kind: "exponential", skew: 2, symmetric: true };

  it("pins the centre value at position 0.5", () => {
    expect(taperToNormalized(taper, 0, -1, 1)).toBeCloseTo(0.5, TOL);
    expect(taperFromNormalized(taper, 0.5, -1, 1)).toBeCloseTo(0, TOL);
  });

  it("stays symmetric about the centre", () => {
    const below = taperFromNormalized(taper, 0.25, -1, 1);
    const above = taperFromNormalized(taper, 0.75, -1, 1);
    expect(below).toBeCloseTo(-above, 9);
  });

  it("round-trips", () => {
    expectPositionRoundTrip(taper, -1, 1);
  });
});

describe("setSkewForCentre", () => {
  it("derives a skew that lands the centre value at 0.5", () => {
    const skew = setSkewForCentre(20, 20000, 1000);
    const taper: Taper = { kind: "exponential", skew };
    expect(taperToNormalized(taper, 1000, 20, 20000)).toBeCloseTo(0.5, 9);
  });

  it("works for an arbitrary centre", () => {
    const skew = setSkewForCentre(0, 100, 25);
    const taper: Taper = { kind: "exponential", skew };
    expect(taperToNormalized(taper, 25, 0, 100)).toBeCloseTo(0.5, 9);
  });

  it("throws when the centre is not strictly inside the range", () => {
    expect(() => setSkewForCentre(0, 100, 0)).toThrow();
    expect(() => setSkewForCentre(0, 100, 100)).toThrow();
  });
});
