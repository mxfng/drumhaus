/**
 * Browser tests for AudioEngine.rebuild() (phase 5 recovery path).
 *
 * rebuild() tears down and reconstructs the whole graph from the engine's
 * retained state. Because renderWav is a pure function of that same
 * retained state, a render after rebuild() must be indistinguishable from
 * the render before it - same onsets, same timing.
 */

import { beforeAll, describe, expect, it } from "vitest";

import { findOnsets } from "@/test/analysis";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
} from "@/test/fixtures";
import { createFixtureEngine } from "@/test/render";

const BPM = 120;
const SAMPLE_RATE = 44100;
/** Tolerance for onset-delta comparisons across renders. */
const TOL = 0.001;

let clickUrl: string;

beforeAll(() => {
  clickUrl = makeClickSampleUrl();
});

function deltas(onsets: number[]): number[] {
  return onsets.slice(1).map((t, i) => t - onsets[i]);
}

describe("engine rebuild", () => {
  it("renders identical onsets before and after rebuild()", async () => {
    const engine = await createFixtureEngine({
      pattern: makePattern({
        steps: [
          ...[0, 4, 8, 12].map((step) => ({ voice: 0, step })),
          { voice: 1, step: 6 },
        ],
      }),
      instruments: [makeInstrument(0, "kick"), makeInstrument(1, "snare")],
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    });

    try {
      const renderOptions = {
        bars: 1,
        sampleRate: SAMPLE_RATE,
        includeTail: false,
      };

      const baselineBuffer = await engine.renderWav(renderOptions);
      const baselineOnsets = findOnsets(baselineBuffer);
      expect(baselineOnsets).toHaveLength(5);

      await engine.rebuild();

      const rebuiltBuffer = await engine.renderWav(renderOptions);
      const rebuiltOnsets = findOnsets(rebuiltBuffer);

      expect(rebuiltOnsets).toHaveLength(baselineOnsets.length);

      const baselineDeltas = deltas(baselineOnsets);
      const rebuiltDeltas = deltas(rebuiltOnsets);
      rebuiltDeltas.forEach((delta, i) => {
        expect(Math.abs(delta - baselineDeltas[i])).toBeLessThan(TOL);
      });
    } finally {
      engine.dispose();
    }
  });

  it("serializes concurrent rebuild() calls and still renders the baseline", async () => {
    const engine = await createFixtureEngine({
      pattern: makePattern({
        steps: [0, 4, 8, 12].map((step) => ({ voice: 0, step })),
      }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [clickUrl],
      bpm: BPM,
    });

    try {
      const renderOptions = {
        bars: 1,
        sampleRate: SAMPLE_RATE,
        includeTail: false,
      };

      const baselineOnsets = findOnsets(await engine.renderWav(renderOptions));
      expect(baselineOnsets).toHaveLength(4);

      // Concurrent rebuilds must share ONE in-flight rebuild (the same
      // promise instance): a second overlapping teardown/reconstruct pass
      // could otherwise duplicate the master bus.
      const first = engine.rebuild();
      const second = engine.rebuild();
      expect(second).toBe(first);
      await Promise.all([first, second]);

      const rebuiltOnsets = findOnsets(await engine.renderWav(renderOptions));
      expect(rebuiltOnsets).toHaveLength(baselineOnsets.length);

      const baselineDeltas = deltas(baselineOnsets);
      deltas(rebuiltOnsets).forEach((delta, i) => {
        expect(Math.abs(delta - baselineDeltas[i])).toBeLessThan(TOL);
      });
    } finally {
      engine.dispose();
    }
  });

  it("leaves every channel ready after rebuild() with a kit loaded", async () => {
    const engine = await createFixtureEngine({
      pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
      instruments: [
        makeInstrument(0, "kick"),
        makeInstrument(1, "snare"),
        makeInstrument(2, "hat"),
      ],
      sampleUrls: [clickUrl, clickUrl, clickUrl],
      bpm: BPM,
    });

    try {
      expect(engine.isChannelReady(0)).toBe(true);
      expect(engine.isChannelReady(1)).toBe(true);
      expect(engine.isChannelReady(2)).toBe(true);

      await engine.rebuild();

      expect(engine.isChannelReady(0)).toBe(true);
      expect(engine.isChannelReady(1)).toBe(true);
      expect(engine.isChannelReady(2)).toBe(true);
    } finally {
      engine.dispose();
    }
  });
});
