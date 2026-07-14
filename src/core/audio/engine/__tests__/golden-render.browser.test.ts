/**
 * Golden offline-render regression tests for the current audio engine.
 *
 * These capture CURRENT engine behavior ahead of the audio engine refactor
 * (docs/audio-engine-refactor.md). Every later phase must keep them green.
 *
 * All rendering goes through renderFixture (src/test/render.ts) - its public
 * interface is the stable contract; only its internals change per phase.
 *
 * NOTE on timing: the master chain delays the dry path by 6ms
 * (MASTER_COMP_LATENCY) to match the compressor's lookahead, and the
 * always-in-line limiter adds its own ~6ms of lookahead, so absolute onset
 * times include a small constant offset (~12ms measured). All assertions
 * therefore use DELTAS between onsets, or compare two renders against each
 * other.
 */

import { beforeAll, describe, expect, it } from "vitest";

import { findOnsets, peakInWindow, rmsInWindow } from "@/test/analysis";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
  makeToneSampleUrl,
} from "@/test/fixtures";
import { renderFixture } from "@/test/render";

const BPM = 120;
/** Duration of one 16th note at 120 BPM. */
const STEP = 60 / BPM / 4; // 0.125s
/** Tolerance for onset-delta assertions. */
const TOL = 0.005;

/**
 * Swing offset applied to odd 16th steps at swing knob 50.
 * Engine: transport.swing = (50 / 100) * TRANSPORT_SWING_MAX(0.5) = 0.25.
 * Tone Transport._processTick (tone@15.5.25): for ticks halfway between
 * swing subdivision pairs, offset = sin(pi * 0.5) * swing * Ticks((swingTicks * 2) / 3).
 * With 16n subdivision (48 ticks at PPQ 192): (48 * 2) / 3 = 32 ticks
 * = (32 / 192) beats = (1 / 6) * (60 / BPM) seconds.
 * At 120 BPM: 0.25 * (1 / 6) * 0.5 = 0.0208333s.
 */
const SWING_50_OFFSET = 0.25 * (1 / 6) * (60 / BPM);

/** FLAM_OFFSET_SECONDS in engine/sequencer/sequencer.ts. */
const FLAM_OFFSET = 0.015;

/** RATCHET_OFFSET_BEATS (0.125) * seconds per beat at 120 BPM. */
const RATCHET_OFFSET = 0.125 * (60 / BPM); // 0.0625s

/**
 * Timing nudge +2: nudgeToBeatOffset(2) = 2 * (1 / 96) beats
 * (features/sequencer/lib/timing.ts), converted at 120 BPM.
 */
const NUDGE_PLUS_2_OFFSET = (2 / 96) * (60 / BPM); // 0.0104167s

/**
 * Master params that disable parallel compression for stable peak
 * comparisons (compMix 0 = fully dry, compThreshold 100 = knob fully open).
 */
const NO_COMP = { compMix: 0, compThreshold: 100 };

let clickUrl: string;
let toneUrl: string;

beforeAll(() => {
  clickUrl = makeClickSampleUrl();
  toneUrl = makeToneSampleUrl(1.5);
});

function deltas(onsets: number[]): number[] {
  return onsets.slice(1).map((t, i) => t - onsets[i]);
}

describe("golden render: grid timing", () => {
  it("plays four-on-the-floor kicks 0.5s apart", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [0, 4, 8, 12].map((step) => ({ voice: 0, step })),
      }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(4);
    for (const delta of deltas(onsets)) {
      expect(delta).toBeGreaterThan(4 * STEP - TOL);
      expect(delta).toBeLessThan(4 * STEP + TOL);
    }
  });

  it("plays all sixteen 16ths evenly with no swing", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: Array.from({ length: 16 }, (_, step) => ({ voice: 0, step })),
      }),
      instruments: [makeInstrument(0, "hat")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(16);
    for (const delta of deltas(onsets)) {
      expect(delta).toBeGreaterThan(STEP - TOL);
      expect(delta).toBeLessThan(STEP + TOL);
    }
  });
});

describe("golden render: swing", () => {
  const pattern = () =>
    makePattern({
      steps: Array.from({ length: 16 }, (_, step) => ({ voice: 0, step })),
    });

  it("alternates long/short 16ths at swing 50 and stays uniform at swing 0", async () => {
    const swungBuffer = await renderFixture({
      pattern: pattern(),
      instruments: [makeInstrument(0, "hat")],
      sampleUrls: [clickUrl],
      bpm: BPM,
      swing: 50,
    });

    const onsets = findOnsets(swungBuffer);
    expect(onsets).toHaveLength(16);

    const swungDeltas = deltas(onsets);
    // Odd steps are pushed late: even->odd gaps are long, odd->even short.
    expect(swungDeltas[0]).toBeGreaterThan(0.13);
    for (let i = 0; i < swungDeltas.length; i++) {
      const expected =
        i % 2 === 0 ? STEP + SWING_50_OFFSET : STEP - SWING_50_OFFSET;
      expect(swungDeltas[i]).toBeGreaterThan(expected - TOL);
      expect(swungDeltas[i]).toBeLessThan(expected + TOL);
    }
    // Swing shifts odd steps only, so each 8th note stays 0.25s long.
    for (let i = 0; i + 1 < swungDeltas.length; i += 2) {
      const pairSum = swungDeltas[i] + swungDeltas[i + 1];
      expect(pairSum).toBeGreaterThan(2 * STEP - TOL);
      expect(pairSum).toBeLessThan(2 * STEP + TOL);
    }

    const straightBuffer = await renderFixture({
      pattern: pattern(),
      instruments: [makeInstrument(0, "hat")],
      sampleUrls: [clickUrl],
      bpm: BPM,
      swing: 0,
    });

    const straightOnsets = findOnsets(straightBuffer);
    expect(straightOnsets).toHaveLength(16);
    for (const delta of deltas(straightOnsets)) {
      expect(delta).toBeGreaterThan(STEP - TOL);
      expect(delta).toBeLessThan(STEP + TOL);
    }
  });
});

describe("golden render: flam and ratchet", () => {
  it("plays a grace note ~15ms before a flammed hit", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({ steps: [{ voice: 0, step: 4, flam: true }] }),
      instruments: [makeInstrument(0, "snare")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(2);
    const gap = onsets[1] - onsets[0];
    expect(gap).toBeGreaterThan(0.01);
    expect(gap).toBeLessThan(0.02);
    expect(gap).toBeCloseTo(FLAM_OFFSET, 2);
  });

  it("plays a ratchet hit a 32nd note after the main hit", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({ steps: [{ voice: 0, step: 0, ratchet: true }] }),
      instruments: [makeInstrument(0, "snare")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(2);
    const gap = onsets[1] - onsets[0];
    expect(gap).toBeGreaterThan(RATCHET_OFFSET - TOL);
    expect(gap).toBeLessThan(RATCHET_OFFSET + TOL);
  });
});

describe("golden render: timing nudge", () => {
  it("shifts a +2 nudged voice late by 2/96 of a beat", async () => {
    // Voice 1 is an un-nudged anchor on step 0 in BOTH renders; the nudged
    // voice 0 hit on step 4 is measured relative to it within each render.
    const instruments = [makeInstrument(0, "kick"), makeInstrument(1, "snare")];
    const steps = [
      { voice: 0, step: 4 },
      { voice: 1, step: 0 },
    ];

    const baseBuffer = await renderFixture({
      pattern: makePattern({ steps }),
      instruments,
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    });
    const nudgedBuffer = await renderFixture({
      pattern: makePattern({ steps, nudges: [{ voice: 0, nudge: 2 }] }),
      instruments,
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    });

    const baseOnsets = findOnsets(baseBuffer);
    const nudgedOnsets = findOnsets(nudgedBuffer);
    expect(baseOnsets).toHaveLength(2);
    expect(nudgedOnsets).toHaveLength(2);

    const baseGap = baseOnsets[1] - baseOnsets[0];
    const nudgedGap = nudgedOnsets[1] - nudgedOnsets[0];
    const shift = nudgedGap - baseGap;
    expect(shift).toBeGreaterThan(NUDGE_PLUS_2_OFFSET - 0.003);
    expect(shift).toBeLessThan(NUDGE_PLUS_2_OFFSET + 0.003);
  });
});

describe("golden render: step-0 pre-bar trimming", () => {
  // BASELINE CHANGE (#318): renderWav pre-rolls the offline transport past
  // the compressor warm-up and slices the pre-roll off, so the export
  // starts exactly on the bar line. Step-0 events pulled ahead of the bar
  // line - flam grace notes and negative timing nudges - now land inside
  // the pre-roll and are trimmed at the bar line, replacing the previous
  // "step-0 time clamping" golden, which asserted the old clamp-to-t=0
  // behavior (all pre-bar events stacked ON the bar line).
  it("trims a step-0 flam grace note, keeping the main hit on the bar line", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0, flam: true },
          { voice: 0, step: 4 },
        ],
      }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    // The grace note (bar line - 15ms) is cut at the bar line; only its
    // sub-peak decay tail bleeds into the export through the master
    // chain's ~12ms latency. The raised threshold ignores that residual
    // (measured ~0.11; an untrimmed grace would peak near 0.6) while
    // still catching every full hit.
    const onsets = findOnsets(buffer, { threshold: 0.2 });
    // Two onsets, not three: contrast with the step-4 flam test above,
    // which keeps its grace note and resolves two onsets 15ms apart.
    expect(onsets).toHaveLength(2);
    // The main hit stays on the bar line (offset only by master chain
    // latency).
    expect(onsets[0]).toBeLessThan(0.02);
    // The step-4 hit stays on the grid relative to it.
    expect(onsets[1] - onsets[0]).toBeGreaterThan(4 * STEP - TOL);
    expect(onsets[1] - onsets[0]).toBeLessThan(4 * STEP + TOL);
    // The trimmed grace leaves at most a quiet residual ahead of the main
    // hit's onset.
    expect(peakInWindow(buffer, 0, 0.008)).toBeLessThan(0.2);
  });

  it("keeps a step-0 negative nudge early instead of clamping it to the bar line", async () => {
    // Nudge -2 pulls hits ~10.4ms early at 120 BPM. Pre-#318, the step-0
    // trigger clamped to t=0 (losing its nudge), so the step-0 -> step-8
    // gap measured 8 steps MINUS the nudge; now the whole voice keeps its
    // timing and the gap is exactly 8 steps. The step-0 hit is trimmed at
    // the bar line, but the master chain's ~12ms latency exceeds the
    // 10.4ms nudge, so its audio still lands intact just inside the
    // export - matching how the nudge sounds in live playback.
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0 },
          { voice: 0, step: 8 },
        ],
        nudges: [{ voice: 0, nudge: -2 }],
      }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(2);
    // The nudged step-0 hit sounds ahead of where a bar-line hit lands
    // (~12ms), not clamped onto it.
    expect(onsets[0]).toBeLessThan(0.01);
    // Both hits carry the same -2 nudge, so their gap is exactly 8 steps
    // (the old clamp made this 8 * STEP - NUDGE_PLUS_2_OFFSET).
    expect(onsets[1] - onsets[0]).toBeGreaterThan(8 * STEP - TOL);
    expect(onsets[1] - onsets[0]).toBeLessThan(8 * STEP + TOL);
  });
});

describe("golden render: accent and velocity", () => {
  // Peak comparisons INCLUDE step 0 (baseline change, #318): renderWav's
  // pre-roll removed the compressor warm-up that used to render the first
  // hit of an export ~59% quieter than steady state, so first-hit peaks
  // now match every later step (locked in by the first-hit amplitude test
  // below). Steps 0 and 8 sit exactly 1s apart at 120 BPM, so both hits
  // share the same sub-sample trigger phase and their peaks compare
  // cleanly.
  it("boosts accented steps relative to non-accented steps", async () => {
    const instruments = [makeInstrument(0, "snare")];
    const steps = [
      { voice: 0, step: 0 },
      { voice: 0, step: 8 },
    ];

    const accentedBuffer = await renderFixture({
      pattern: makePattern({ steps, accents: [{ step: 8 }] }),
      instruments,
      sampleUrls: [clickUrl],
      bpm: BPM,
      masterParams: NO_COMP,
    });

    const onsets = findOnsets(accentedBuffer);
    expect(onsets).toHaveLength(2);
    const peak1 = peakInWindow(accentedBuffer, onsets[0], onsets[0] + 0.015);
    const peak2 = peakInWindow(accentedBuffer, onsets[1], onsets[1] + 0.015);
    // Engine (sequencer/precompute.ts): with accents present, non-accented
    // hits are dampened to velocity / 1.3 while accented hits stay at
    // min(1, velocity) - an effective 1.3x boost.
    expect(peak2).toBeGreaterThan(peak1 * 1.1);

    const plainBuffer = await renderFixture({
      pattern: makePattern({ steps }),
      instruments,
      sampleUrls: [clickUrl],
      bpm: BPM,
      masterParams: NO_COMP,
    });

    const plainOnsets = findOnsets(plainBuffer);
    expect(plainOnsets).toHaveLength(2);
    const plainPeak1 = peakInWindow(
      plainBuffer,
      plainOnsets[0],
      plainOnsets[0] + 0.015,
    );
    const plainPeak2 = peakInWindow(
      plainBuffer,
      plainOnsets[1],
      plainOnsets[1] + 0.015,
    );
    expect(Math.abs(plainPeak2 - plainPeak1)).toBeLessThan(plainPeak1 * 0.1);
  });

  // Locks out #318: Chromium's DynamicsCompressorNode initializes its
  // internal gain low and slews to unity over the first ~100ms of a fresh
  // context, so un-pre-rolled renders played a step-0 hit at ~41% of
  // steady-state amplitude (measured 0.4039 vs 0.9888 through the full
  // master chain). renderWav's pre-roll moves the warm-up out of the
  // export; the cured first/steady ratio measures 1.0000.
  it("renders the first hit at steady-state amplitude", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: Array.from({ length: 16 }, (_, step) => ({ voice: 0, step })),
      }),
      instruments: [makeInstrument(0, "hat")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(16);

    const firstPeak = peakInWindow(buffer, onsets[0], onsets[0] + 0.015);
    // Onset 8 lies exactly 1s after the first hit (8 steps at 120 BPM),
    // so it shares the first hit's sub-sample trigger phase; peaks vary
    // ~2% with sub-sample alignment and this pairing cancels that out.
    const steadyPeak = peakInWindow(buffer, onsets[8], onsets[8] + 0.015);
    expect(firstPeak).toBeGreaterThan(steadyPeak * 0.98);
    expect(firstPeak).toBeLessThan(steadyPeak * 1.02);
  });

  it("scales hit amplitude by step velocity", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0, velocity: 1.0 },
          { voice: 0, step: 8, velocity: 0.25 },
        ],
      }),
      instruments: [makeInstrument(0, "snare")],
      sampleUrls: [clickUrl],
      bpm: BPM,
      masterParams: NO_COMP,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(2);
    const peak1 = peakInWindow(buffer, onsets[0], onsets[0] + 0.015);
    const peak2 = peakInWindow(buffer, onsets[1], onsets[1] + 0.015);
    expect(peak2).toBeLessThan(peak1 * 0.5);
  });
});

describe("golden render: chain advance", () => {
  it("advances A -> B at the bar boundary when the chain is enabled", async () => {
    // Variation A: step 0 only. Variation B: steps 0 and 8.
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0, variation: 0 },
          { voice: 0, step: 0, variation: 1 },
          { voice: 0, step: 8, variation: 1 },
        ],
      }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [clickUrl],
      bpm: BPM,
      bars: 2,
      chain: {
        steps: [
          { variation: 0, repeats: 1 },
          { variation: 1, repeats: 1 },
        ],
      },
      chainEnabled: true,
      variation: 0,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(3);
    // Bar 2 hits land at bar + 0s and bar + 8 steps = 1.0s apart.
    const lastDelta = onsets[2] - onsets[1];
    expect(lastDelta).toBeGreaterThan(8 * STEP - TOL);
    expect(lastDelta).toBeLessThan(8 * STEP + TOL);
    // Bar 1 (variation A) contributes only the first onset.
    const firstDelta = onsets[1] - onsets[0];
    expect(firstDelta).toBeGreaterThan(16 * STEP - TOL);
    expect(firstDelta).toBeLessThan(16 * STEP + TOL);
  });
});

describe("golden render: mute and solo", () => {
  // Voice 1 triggers a different step than voice 0 so its silence is
  // observable as a missing onset rather than a merged simultaneous hit.
  const steps = [
    { voice: 0, step: 0 },
    { voice: 1, step: 8 },
  ];

  it("silences a muted voice", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({ steps }),
      instruments: [
        makeInstrument(0, "kick"),
        makeInstrument(1, "snare", { mute: true }),
      ],
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    });

    expect(findOnsets(buffer)).toHaveLength(1);
  });

  it("silences non-soloed voices when another voice is soloed", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({ steps }),
      instruments: [
        makeInstrument(0, "kick", { solo: true }),
        makeInstrument(1, "snare"),
      ],
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    });

    expect(findOnsets(buffer)).toHaveLength(1);
  });
});

describe("golden render: hat choke", () => {
  it("chokes the open hat when the closed hat triggers", async () => {
    const instruments = [makeInstrument(0, "ohat"), makeInstrument(1, "hat")];
    const sampleUrls = [toneUrl, clickUrl];

    // Open hat: sustained 1.5s tone from step 0. Closed hat at step 8 (1.0s).
    const chokedBuffer = await renderFixture({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0 },
          { voice: 1, step: 8 },
        ],
      }),
      instruments,
      sampleUrls,
      bpm: BPM,
    });

    // Control: same open hat, no closed hat trigger.
    const controlBuffer = await renderFixture({
      pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
      instruments,
      sampleUrls,
      bpm: BPM,
    });

    const controlRms = rmsInWindow(controlBuffer, 1.1, 1.3);
    const chokedRms = rmsInWindow(chokedBuffer, 1.1, 1.3);
    expect(controlRms).toBeGreaterThan(0.05); // Sanity: tone is audible.
    expect(chokedRms).toBeLessThan(controlRms * 0.2);
  });
});
