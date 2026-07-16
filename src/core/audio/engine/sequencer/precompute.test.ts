import { describe, expect, it } from "vitest";

import { createEmptyPattern } from "@/core/audio/engine/pattern-types";
import {
  ACCENT_BOOST,
  ACCENT_DAMPEN,
  STEP_COUNT,
  VARIATION_COUNT,
} from "../constants";
import { buildPrecomputedPattern } from "./precompute";

describe("buildPrecomputedPattern", () => {
  it("produces an empty hit grid for an empty pattern", () => {
    const precomputed = buildPrecomputedPattern(createEmptyPattern());
    expect(precomputed.stepsByVariation).toHaveLength(VARIATION_COUNT);
    for (const variation of precomputed.stepsByVariation) {
      expect(variation).toHaveLength(STEP_COUNT);
      for (const hits of variation) {
        expect(hits).toHaveLength(0);
      }
    }
  });

  it("maps triggers to hits at the right steps and variations", () => {
    const pattern = createEmptyPattern();
    pattern.voices[0].variations[0].triggers[3] = true;
    pattern.voices[2].variations[1].triggers[5] = true;

    const precomputed = buildPrecomputedPattern(pattern);

    const variationA = precomputed.stepsByVariation[0];
    const variationB = precomputed.stepsByVariation[1];

    expect(variationA[3]).toHaveLength(1);
    expect(variationA[3][0].voice).toBe(pattern.voices[0]);
    expect(variationB[5]).toHaveLength(1);
    expect(variationB[5][0].voice).toBe(pattern.voices[2]);

    // No hits leak into other cells.
    let totalHits = 0;
    for (const variation of precomputed.stepsByVariation) {
      for (const hits of variation) {
        totalHits += hits.length;
      }
    }
    expect(totalHits).toBe(2);
  });

  it("stacks simultaneous hits from multiple voices on the same step", () => {
    const pattern = createEmptyPattern();
    pattern.voices[0].variations[0].triggers[0] = true;
    pattern.voices[1].variations[0].triggers[0] = true;

    const precomputed = buildPrecomputedPattern(pattern);
    expect(precomputed.stepsByVariation[0][0]).toHaveLength(2);
  });

  it("leaves velocity untouched when the variation has no accents", () => {
    const pattern = createEmptyPattern();
    pattern.voices[0].variations[0].triggers[0] = true;
    pattern.voices[0].variations[0].velocities[0] = 0.8;

    const precomputed = buildPrecomputedPattern(pattern);
    expect(precomputed.stepsByVariation[0][0][0].velocity).toBe(0.8);
  });

  it("dampens non-accented hits when the variation has accents", () => {
    const pattern = createEmptyPattern();
    pattern.voices[0].variations[0].triggers[0] = true;
    pattern.voices[0].variations[0].velocities[0] = 1.0;
    // Accent a different step so step 0 is non-accented but the variation
    // still "has accents".
    pattern.variationMetadata[0].accent[4] = true;

    const precomputed = buildPrecomputedPattern(pattern);
    expect(precomputed.stepsByVariation[0][0][0].velocity).toBeCloseTo(
      1.0 / ACCENT_DAMPEN,
      10,
    );
  });

  it("boosts accented hits back up, capped at 1.0", () => {
    const pattern = createEmptyPattern();
    pattern.voices[0].variations[0].triggers[4] = true;
    pattern.voices[0].variations[0].velocities[4] = 1.0;
    pattern.voices[0].variations[0].triggers[6] = true;
    pattern.voices[0].variations[0].velocities[6] = 0.5;
    pattern.variationMetadata[0].accent[4] = true;
    pattern.variationMetadata[0].accent[6] = true;

    const precomputed = buildPrecomputedPattern(pattern);

    // velocity 1.0: min(1, (1.0 / 1.3) * 1.3) = 1.0
    expect(precomputed.stepsByVariation[0][4][0].velocity).toBeCloseTo(
      Math.min(1, (1.0 / ACCENT_DAMPEN) * ACCENT_BOOST),
      10,
    );
    // velocity 0.5: (0.5 / 1.3) * 1.3 = 0.5 (below the cap)
    expect(precomputed.stepsByVariation[0][6][0].velocity).toBeCloseTo(
      Math.min(1, (0.5 / ACCENT_DAMPEN) * ACCENT_BOOST),
      10,
    );
  });

  it("scopes accent dampening to the variation that has accents", () => {
    const pattern = createEmptyPattern();
    pattern.voices[0].variations[0].triggers[0] = true;
    pattern.voices[0].variations[1].triggers[0] = true;
    pattern.variationMetadata[0].accent[8] = true; // Accents in A only.

    const precomputed = buildPrecomputedPattern(pattern);
    expect(precomputed.stepsByVariation[0][0][0].velocity).toBeCloseTo(
      1.0 / ACCENT_DAMPEN,
      10,
    );
    expect(precomputed.stepsByVariation[1][0][0].velocity).toBe(1.0);
  });
});
