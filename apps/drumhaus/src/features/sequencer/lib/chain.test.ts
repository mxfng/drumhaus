import { describe, expect, it } from "vitest";

import {
  clampVariationId,
  DEFAULT_CHAIN,
  MAX_CHAIN_REPEAT,
  MAX_CHAIN_STEPS,
  sanitizeChain,
  type PatternChain,
} from "@/core/audio/engine/pattern-types";

describe("clampVariationId", () => {
  it("clamps below range to 0", () => {
    expect(clampVariationId(-1)).toBe(0);
    expect(clampVariationId(-100)).toBe(0);
  });

  it("clamps above range to 3", () => {
    expect(clampVariationId(4)).toBe(3);
    expect(clampVariationId(100)).toBe(3);
  });

  it("passes in-range values through", () => {
    expect(clampVariationId(0)).toBe(0);
    expect(clampVariationId(1)).toBe(1);
    expect(clampVariationId(2)).toBe(2);
    expect(clampVariationId(3)).toBe(3);
  });
});

describe("sanitizeChain", () => {
  it("returns the default chain for undefined input", () => {
    expect(sanitizeChain(undefined)).toEqual(DEFAULT_CHAIN);
  });

  it("returns the default chain when steps is not an array", () => {
    expect(sanitizeChain({ steps: null } as unknown as PatternChain)).toEqual(
      DEFAULT_CHAIN,
    );
  });

  it("returns the default chain for an empty steps array", () => {
    expect(sanitizeChain({ steps: [] })).toEqual(DEFAULT_CHAIN);
  });

  it("returns an empty chain for empty input when allowEmpty is set", () => {
    expect(sanitizeChain({ steps: [] }, { allowEmpty: true })).toEqual({
      steps: [],
    });
    expect(sanitizeChain(undefined, { allowEmpty: true })).toEqual({
      steps: [],
    });
  });

  it("passes a valid chain through unchanged", () => {
    const chain: PatternChain = {
      steps: [
        { variation: 0, repeats: 2 },
        { variation: 3, repeats: 8 },
      ],
    };
    expect(sanitizeChain(chain)).toEqual(chain);
  });

  it("truncates chains longer than MAX_CHAIN_STEPS", () => {
    const chain: PatternChain = {
      steps: Array.from({ length: MAX_CHAIN_STEPS + 4 }, () => ({
        variation: 0 as const,
        repeats: 1,
      })),
    };
    expect(sanitizeChain(chain).steps).toHaveLength(MAX_CHAIN_STEPS);
  });

  it("clamps repeats into [1, MAX_CHAIN_REPEAT]", () => {
    const chain = {
      steps: [
        { variation: 0, repeats: 0 },
        { variation: 0, repeats: -5 },
        { variation: 0, repeats: 100 },
      ],
    } as PatternChain;
    expect(sanitizeChain(chain).steps.map((s) => s.repeats)).toEqual([
      1,
      1,
      MAX_CHAIN_REPEAT,
    ]);
  });

  it("defaults missing repeats to 1", () => {
    const chain = {
      steps: [{ variation: 1 }],
    } as unknown as PatternChain;
    expect(sanitizeChain(chain).steps).toEqual([{ variation: 1, repeats: 1 }]);
  });

  it("clamps out-of-range variation ids", () => {
    const chain = {
      steps: [
        { variation: -1, repeats: 1 },
        { variation: 9, repeats: 1 },
      ],
    } as unknown as PatternChain;
    expect(sanitizeChain(chain).steps.map((s) => s.variation)).toEqual([0, 3]);
  });
});
