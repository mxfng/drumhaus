/**
 * Unit tests for the pure chain playback logic (store-free since phase 3).
 */

import { describe, expect, it } from "vitest";

import type { PatternChain } from "../pattern-types";
import {
  advanceChainAtEndOfBar,
  ChainPlaybackState,
  variationForBarStart,
} from "./chain";

const chainAB: PatternChain = {
  steps: [
    { variation: 0, repeats: 2 },
    { variation: 1, repeats: 3 },
  ],
};

describe("advanceChainAtEndOfBar", () => {
  it("does nothing when the chain is disabled", () => {
    const state: ChainPlaybackState = { stepIndex: 0, repeatsRemaining: 2 };
    advanceChainAtEndOfBar(false, chainAB, state);
    expect(state).toEqual({ stepIndex: 0, repeatsRemaining: 2 });
  });

  it("does nothing when the chain has no steps", () => {
    const state: ChainPlaybackState = { stepIndex: 0, repeatsRemaining: 1 };
    advanceChainAtEndOfBar(true, { steps: [] }, state);
    expect(state).toEqual({ stepIndex: 0, repeatsRemaining: 1 });
  });

  it("decrements repeats while staying on the current step", () => {
    const state: ChainPlaybackState = { stepIndex: 0, repeatsRemaining: 2 };
    advanceChainAtEndOfBar(true, chainAB, state);
    expect(state).toEqual({ stepIndex: 0, repeatsRemaining: 1 });
  });

  it("advances to the next step when repeats are exhausted", () => {
    const state: ChainPlaybackState = { stepIndex: 0, repeatsRemaining: 1 };
    advanceChainAtEndOfBar(true, chainAB, state);
    expect(state).toEqual({ stepIndex: 1, repeatsRemaining: 3 });
  });

  it("wraps around to the first step at the end of the chain", () => {
    const state: ChainPlaybackState = { stepIndex: 1, repeatsRemaining: 1 };
    advanceChainAtEndOfBar(true, chainAB, state);
    expect(state).toEqual({ stepIndex: 0, repeatsRemaining: 2 });
  });

  it("handles a single-step chain by looping on it", () => {
    const chain: PatternChain = { steps: [{ variation: 2, repeats: 1 }] };
    const state: ChainPlaybackState = { stepIndex: 0, repeatsRemaining: 1 };
    advanceChainAtEndOfBar(true, chain, state);
    expect(state).toEqual({ stepIndex: 0, repeatsRemaining: 1 });
  });

  it("recovers when repeats underflow below zero", () => {
    const state: ChainPlaybackState = { stepIndex: 0, repeatsRemaining: 0 };
    advanceChainAtEndOfBar(true, chainAB, state);
    expect(state).toEqual({ stepIndex: 1, repeatsRemaining: 3 });
  });
});

describe("variationForBarStart", () => {
  it("returns the latest pushed variation when the chain is disabled", () => {
    const state: ChainPlaybackState = { stepIndex: 1, repeatsRemaining: 2 };
    expect(variationForBarStart(false, chainAB, state, 3)).toBe(3);
    // Chain state is left untouched in non-chain mode.
    expect(state).toEqual({ stepIndex: 1, repeatsRemaining: 2 });
  });

  it("returns the latest pushed variation when the chain has no steps", () => {
    const state: ChainPlaybackState = { stepIndex: 0, repeatsRemaining: 1 };
    expect(variationForBarStart(true, { steps: [] }, state, 2)).toBe(2);
  });

  it("returns the current chain step's variation in chain mode", () => {
    const state: ChainPlaybackState = { stepIndex: 1, repeatsRemaining: 3 };
    expect(variationForBarStart(true, chainAB, state, 0)).toBe(1);
  });

  it("wraps an out-of-range chain position back to the first step", () => {
    const state: ChainPlaybackState = { stepIndex: 2, repeatsRemaining: 1 };
    expect(variationForBarStart(true, chainAB, state, 3)).toBe(0);
    expect(state).toEqual({ stepIndex: 0, repeatsRemaining: 2 });
  });
});
