/**
 * Pure grid math: beat/bar durations, position derivation, phase-preserving
 * tempo rebase (property-style over random bpm pairs and instants), and the
 * AudioContext clock mapping including the getOutputTimestamp fallback.
 */

import { describe, expect, it } from "vitest";

import {
  barMs,
  barsAt,
  beatMs,
  beatsAt,
  clampBpm,
  contextClockAnchor,
  contextTimeToEpochMs,
  epochNowMs,
  epochToContextTime,
  nextBarStartEpochMs,
  rebaseTempo,
  type BridgeAudioContext,
} from "../clock";
import type { SessionState } from "../types";

function playingState(bpm: number, startEpochMs: number): SessionState {
  return { rev: 0, bpm, playing: true, startEpochMs, scene: 0 };
}

const STOPPED: SessionState = {
  rev: 0,
  bpm: 120,
  playing: false,
  startEpochMs: null,
  scene: 0,
};

describe("epochNowMs", () => {
  it("is finite and monotonically non-decreasing", () => {
    const a = epochNowMs();
    const b = epochNowMs();
    expect(Number.isFinite(a)).toBe(true);
    expect(b).toBeGreaterThanOrEqual(a);
  });
});

describe("durations", () => {
  it("derives beat and bar durations from bpm", () => {
    expect(beatMs(120)).toBe(500);
    expect(beatMs(60)).toBe(1000);
    expect(barMs(120)).toBe(2000);
  });

  it("clamps bpm to the protocol range", () => {
    expect(clampBpm(10)).toBe(40);
    expect(clampBpm(1000)).toBe(300);
    expect(clampBpm(174)).toBe(174);
  });
});

describe("position derivation", () => {
  const state = playingState(120, 1000);

  it("derives beats and bars from (startEpochMs, bpm)", () => {
    expect(beatsAt(state, 1000)).toBe(0);
    expect(beatsAt(state, 2000)).toBe(2);
    expect(barsAt(state, 3000)).toBe(1);
  });

  it("is negative during the start lead window", () => {
    expect(beatsAt(state, 900)).toBeCloseTo(-0.2, 10);
  });

  it("returns null while stopped", () => {
    expect(beatsAt(STOPPED, 1000)).toBeNull();
    expect(barsAt(STOPPED, 1000)).toBeNull();
    expect(nextBarStartEpochMs(STOPPED, 1000)).toBeNull();
  });

  it("finds the first bar boundary strictly after the instant", () => {
    expect(nextBarStartEpochMs(state, 1001)).toBe(3000);
    expect(nextBarStartEpochMs(state, 2999)).toBe(3000);
    // Exactly on a boundary: strictly after means the following bar.
    expect(nextBarStartEpochMs(state, 3000)).toBe(5000);
    // During the lead window the next boundary is bar 0's downbeat.
    expect(nextBarStartEpochMs(state, 900)).toBe(1000);
  });
});

describe("rebaseTempo", () => {
  it("preserves phase continuity at the decision instant", () => {
    const state = playingState(120, 10_000);
    const rebased = rebaseTempo(state, 150, 14_000);
    expect(rebased.bpm).toBe(150);
    expect(beatsAt(rebased, 14_000)).toBeCloseTo(beatsAt(state, 14_000)!, 9);
  });

  it("preserves phase over random bpm pairs and instants", () => {
    for (let i = 0; i < 250; i++) {
      const oldBpm = 40 + Math.random() * 260;
      const newBpm = 40 + Math.random() * 260;
      const start = 1.7e12 + Math.random() * 1e7;
      // Instants both after the downbeat and inside the lead window.
      const at = start + (Math.random() - 0.1) * 600_000;
      const state = playingState(oldBpm, start);
      const rebased = rebaseTempo(state, newBpm, at);
      expect(rebased.playing).toBe(true);
      expect(beatsAt(rebased, at)!).toBeCloseTo(beatsAt(state, at)!, 5);
      // Past the decision instant the new grid advances at the new rate.
      const later = at + 10_000;
      expect(beatsAt(rebased, later)!).toBeCloseTo(
        beatsAt(state, at)! + 10_000 / beatMs(newBpm),
        5,
      );
    }
  });

  it("only sets bpm while stopped", () => {
    const rebased = rebaseTempo(STOPPED, 90, 5000);
    expect(rebased).toEqual({ ...STOPPED, bpm: 90 });
  });

  it("clamps the new bpm", () => {
    const state = playingState(120, 1000);
    expect(rebaseTempo(state, 9999, 2000).bpm).toBe(300);
    expect(rebaseTempo(STOPPED, 1, 2000).bpm).toBe(40);
  });

  it("does not bump rev (rev is the conductor's job)", () => {
    const state = { ...playingState(120, 1000), rev: 7 };
    expect(rebaseTempo(state, 90, 2000).rev).toBe(7);
  });
});

describe("AudioContext clock mapping", () => {
  it("anchors on getOutputTimestamp when it reports real output", () => {
    const ctx: BridgeAudioContext = {
      currentTime: 99, // must be ignored when the timestamp is valid
      getOutputTimestamp: () => ({ contextTime: 1.5, performanceTime: 2500 }),
    };
    const anchorEpochMs = performance.timeOrigin + 2500;
    expect(epochToContextTime(ctx, anchorEpochMs)).toBeCloseTo(1.5, 9);
    expect(epochToContextTime(ctx, anchorEpochMs + 1000)).toBeCloseTo(2.5, 9);
    expect(contextTimeToEpochMs(ctx, 2.5)).toBeCloseTo(anchorEpochMs + 1000, 6);
  });

  it("falls back to currentTime when getOutputTimestamp is unavailable", () => {
    const ctx: BridgeAudioContext = { currentTime: 3 };
    const epochNow = () => 50_000;
    expect(epochToContextTime(ctx, 51_000, epochNow)).toBeCloseTo(4, 9);
    expect(contextTimeToEpochMs(ctx, 2, epochNow)).toBeCloseTo(49_000, 9);
  });

  it("falls back when getOutputTimestamp returns zeros (no output yet)", () => {
    const ctx: BridgeAudioContext = {
      currentTime: 0,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    };
    const epochNow = () => 10_000;
    expect(epochToContextTime(ctx, 10_200, epochNow)).toBeCloseTo(0.2, 9);
  });

  it("falls back when getOutputTimestamp returns an empty object", () => {
    const ctx: BridgeAudioContext = {
      currentTime: 1,
      getOutputTimestamp: () => ({}),
    };
    const epochNow = () => 10_000;
    expect(epochToContextTime(ctx, 10_500, epochNow)).toBeCloseTo(1.5, 9);
  });

  it("reports the outputTimestamp kind when the timestamp anchors", () => {
    const ctx: BridgeAudioContext = {
      currentTime: 99,
      getOutputTimestamp: () => ({ contextTime: 1.5, performanceTime: 2500 }),
    };
    const anchor = contextClockAnchor(ctx);
    expect(anchor.kind).toBe("outputTimestamp");
    expect(anchor.contextTimeS).toBe(1.5);
    expect(anchor.epochMs).toBe(performance.timeOrigin + 2500);
  });

  it("reports the currentTime kind when getOutputTimestamp is unavailable", () => {
    const ctx: BridgeAudioContext = { currentTime: 3 };
    const anchor = contextClockAnchor(ctx, () => 50_000);
    expect(anchor.kind).toBe("currentTime");
    expect(anchor.contextTimeS).toBe(3);
    expect(anchor.epochMs).toBe(50_000);
  });

  it("reports the currentTime kind on the zeros fallback (no output yet)", () => {
    const ctx: BridgeAudioContext = {
      currentTime: 0.25,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    };
    expect(contextClockAnchor(ctx, () => 10_000).kind).toBe("currentTime");
  });

  it("reports the currentTime kind on the empty-timestamp fallback", () => {
    const ctx: BridgeAudioContext = {
      currentTime: 1,
      getOutputTimestamp: () => ({}),
    };
    expect(contextClockAnchor(ctx, () => 10_000).kind).toBe("currentTime");
  });

  it("round-trips epoch to context time and back", () => {
    const ctx: BridgeAudioContext = {
      currentTime: 12.25,
      getOutputTimestamp: () => ({ contextTime: 12.5, performanceTime: 700 }),
    };
    const target = performance.timeOrigin + 12_345;
    const contextTime = epochToContextTime(ctx, target);
    expect(contextTimeToEpochMs(ctx, contextTime)).toBeCloseTo(target, 6);
  });
});
