/**
 * The AudioContext clock mapping against a real AudioContext. A fresh
 * context in an automated browser may be suspended (no gesture), which is
 * exactly the environment the getOutputTimestamp-zeros fallback exists for -
 * these assertions hold on either anchor path.
 */

import { afterAll, describe, expect, it } from "vitest";

import { contextTimeToEpochMs, epochNowMs, epochToContextTime } from "../clock";

const ctx = new AudioContext();

afterAll(async () => {
  await ctx.close();
});

describe("AudioContext mapping with a real context", () => {
  it("maps epoch time to context time with unit slope", () => {
    const target = epochNowMs() + 500;
    const t1 = epochToContextTime(ctx, target);
    const t2 = epochToContextTime(ctx, target + 1000);
    expect(Number.isFinite(t1)).toBe(true);
    // 1000ms of epoch time is 1s of context time (allow anchor re-sampling).
    expect(t2 - t1).toBeCloseTo(1, 3);
  });

  it("round-trips epoch -> context -> epoch within a few milliseconds", () => {
    const target = epochNowMs() + 500;
    const contextTime = epochToContextTime(ctx, target);
    const roundTrip = contextTimeToEpochMs(ctx, contextTime);
    expect(Math.abs(roundTrip - target)).toBeLessThan(50);
  });
});
