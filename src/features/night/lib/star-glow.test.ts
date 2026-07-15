import { describe, expect, it } from "vitest";

import {
  GLOW_ACTIVE_THRESHOLD,
  GLOW_ATTACK_TAU_MS,
  GLOW_DB_FLOOR,
  GLOW_RELEASE_TAU_MS,
  GLOW_SILENT_THRESHOLD,
  glowTargetFromDb,
  smoothGlowLevel,
} from "./star-glow";

describe("glowTargetFromDb", () => {
  it("maps silence (-Infinity dB) to 0", () => {
    expect(glowTargetFromDb(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it("maps NaN defensively to 0", () => {
    expect(glowTargetFromDb(Number.NaN)).toBe(0);
  });

  it("clamps at and below the dB floor to 0", () => {
    expect(glowTargetFromDb(GLOW_DB_FLOOR)).toBe(0);
    expect(glowTargetFromDb(GLOW_DB_FLOOR - 20)).toBe(0);
  });

  it("clamps at and above 0 dB to 1", () => {
    expect(glowTargetFromDb(0)).toBe(1);
    expect(glowTargetFromDb(6)).toBe(1);
  });

  it("is linear in dB between the floor and 0 dB", () => {
    expect(glowTargetFromDb(GLOW_DB_FLOOR / 2)).toBeCloseTo(0.5, 5);
    expect(glowTargetFromDb(GLOW_DB_FLOOR * 0.75)).toBeCloseTo(0.25, 5);
    expect(glowTargetFromDb(GLOW_DB_FLOOR * 0.25)).toBeCloseTo(0.75, 5);
  });
});

describe("smoothGlowLevel", () => {
  it("attacks fast: one attack tau covers ~63% of a rise", () => {
    const level = smoothGlowLevel(0, 1, GLOW_ATTACK_TAU_MS);
    expect(level).toBeCloseTo(1 - Math.exp(-1), 5);
  });

  it("releases slowly: a 16ms frame barely moves a fall", () => {
    const level = smoothGlowLevel(1, 0, 16);
    expect(level).toBeCloseTo(Math.exp(-16 / GLOW_RELEASE_TAU_MS), 5);
    expect(level).toBeGreaterThan(0.9);
  });

  it("rises much faster than it falls for the same time step", () => {
    const rise = smoothGlowLevel(0, 1, 16);
    const fall = 1 - smoothGlowLevel(1, 0, 16);
    expect(rise).toBeGreaterThan(fall * 5);
  });

  it("is frame-rate independent for a held target", () => {
    const oneStep = smoothGlowLevel(0.2, 1, 16);
    const twoSteps = smoothGlowLevel(smoothGlowLevel(0.2, 1, 8), 1, 8);
    expect(twoSteps).toBeCloseTo(oneStep, 10);
  });

  it("does not move on a zero time step", () => {
    expect(smoothGlowLevel(0.4, 1, 0)).toBe(0.4);
  });

  it("clamps negative time steps instead of overshooting", () => {
    expect(smoothGlowLevel(0.4, 1, -50)).toBe(0.4);
  });

  it("snaps the silent tail to exactly 0", () => {
    // Decay from a low level toward silence crosses the epsilon and must
    // land on a true 0 so idle rendering is bit-identical to baseline.
    let level = 0.01;
    for (let i = 0; i < 200 && level !== 0; i++) {
      level = smoothGlowLevel(level, 0, 16);
    }
    expect(level).toBe(0);
  });

  it("never snaps while the target itself is audible", () => {
    expect(smoothGlowLevel(0.0005, 0.5, 16)).toBeGreaterThan(0);
  });
});

describe("test-seam thresholds", () => {
  it("keeps hysteresis: active threshold sits above the silent one", () => {
    expect(GLOW_ACTIVE_THRESHOLD).toBeGreaterThan(GLOW_SILENT_THRESHOLD);
  });
});
