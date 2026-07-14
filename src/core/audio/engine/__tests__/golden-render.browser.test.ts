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
 * (MASTER_COMP_LATENCY) to match the compressor's lookahead, so absolute
 * onset times include a small constant offset. All assertions therefore use
 * DELTAS between onsets, or compare two renders against each other.
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

describe("golden render: step-0 time clamping", () => {
  it("renders a step-0 flam plus a negatively nudged step-0 hit", async () => {
    // Voice 0 flams step 0 (grace note would land at -15ms) and plays a
    // plain hit on step 4. Voice 1 has timing nudge -2 (step 0 would land
    // at ~-10ms) with hits on steps 0 and 8. Offline renders start at t=0,
    // so all step-0 trigger times must clamp to 0 instead of throwing a
    // RangeError inside the offline context.
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0, flam: true },
          { voice: 0, step: 4 },
          { voice: 1, step: 0 },
          { voice: 1, step: 8 },
        ],
        nudges: [{ voice: 1, nudge: -2 }],
      }),
      instruments: [makeInstrument(0, "kick"), makeInstrument(1, "snare")],
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    });

    const onsets = findOnsets(buffer);
    // Step 0 collapses into ONE onset: the flam grace note, the flammed
    // main hit, and voice 1's nudged hit all clamp to t=0.
    expect(onsets).toHaveLength(3);
    // The clamped hits land right at the start of the buffer (offset only
    // by the master chain's ~6ms compressor latency).
    expect(onsets[0]).toBeLessThan(0.02);
    // Voice 0's plain step-4 hit stays on the grid relative to step 0.
    expect(onsets[1] - onsets[0]).toBeGreaterThan(4 * STEP - TOL);
    expect(onsets[1] - onsets[0]).toBeLessThan(4 * STEP + TOL);
    // Voice 1's step-8 hit keeps its -2 nudge (no clamping needed there),
    // so the gap from step 4 is 4 steps minus the nudge magnitude.
    const expectedGap = 4 * STEP - NUDGE_PLUS_2_OFFSET;
    expect(onsets[2] - onsets[1]).toBeGreaterThan(expectedGap - TOL);
    expect(onsets[2] - onsets[1]).toBeLessThan(expectedGap + TOL);
  });
});

describe("golden render: accent and velocity", () => {
  // Peak comparisons avoid step 0: the current engine renders the very
  // first hit of an offline render (t=0) ~46% quieter than steady state
  // (verified empirically: hits on all 16 steps peak at 0.4709 then 0.8739
  // for every later step). Timing tests are unaffected; peaks are measured
  // from step 4 onward where amplitude is stable.
  it("boosts accented steps relative to non-accented steps", async () => {
    const instruments = [makeInstrument(0, "snare")];
    const steps = [
      { voice: 0, step: 4 },
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

  it("scales hit amplitude by step velocity", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 4, velocity: 1.0 },
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
