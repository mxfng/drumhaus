/**
 * Render-path smoke for a NON-default split-filter position.
 *
 * The golden renders (../__tests__/golden-render.browser.test.ts) only exercise
 * the neutral, fully-open filter (high-pass at 0 Hz), so the derived LP/HP node
 * targets for an ENGAGED filter never go through an offline render there. This
 * drives an engaged high-pass through the real render path (the same
 * renderFixture + masterParams contract golden/stem use) and confirms it still
 * renders a stable, audible four-on-the-floor - a broadband regression guard
 * complementing the exact-value unit test in split-filter.test.ts.
 *
 * ISOLATION NOTE: vitest browser mode runs every *.browser.test.ts in ONE
 * shared chromium instance, and each offline-render suite spins up real-time +
 * OfflineAudioContexts that contend for the browser's audio subsystem. With
 * file parallelism, adding this third offline-render file once lost a
 * standardized-audio-context node-registration race during GENERIC master-bus
 * Gain wiring (connectMasterBusNodes), before any filter value applies - a
 * test-isolation flake, not a filter/engine defect. vitest.config.ts pins the
 * browser project to fileParallelism: false so the render suites run serially;
 * that change is scheduling-only and cannot alter a rendered byte.
 */

import { beforeAll, describe, expect, it } from "vitest";

import { findOnsets, rmsInWindow } from "@/test/analysis";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
} from "@/test/fixtures";
import { renderFixture } from "@/test/render";

const BPM = 120;
/** One 16th note at 120 BPM. */
const STEP = 60 / BPM / 4;
const TOL = 0.005;

/**
 * Engaged high-pass cutoff (canonical Hz), well inside the master filter range
 * ([0, 15000] Hz). This is the historical knob-70 position expressed in
 * canonical units: (((70 - 50) / 49) * 100 / 100)^2 * 15000 = ~2499 Hz. Being
 * on the high-pass side, the derivation opens the low-pass node to the range
 * max and tracks this cutoff on the high-pass node - a clearly-engaged, non-
 * default position that still lets the click's bright transient through.
 */
const HIGH_PASS_CUTOFF_HZ = 2499;

let clickUrl: string;

beforeAll(() => {
  clickUrl = makeClickSampleUrl();
});

describe("split filter: non-default position render", () => {
  it("renders a stable four-on-the-floor through an engaged high-pass", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [0, 4, 8, 12].map((step) => ({ voice: 0, step })),
      }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [clickUrl],
      bpm: BPM,
      masterParams: {
        filter: { side: "highpass", cutoffHz: HIGH_PASS_CUTOFF_HZ },
      },
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(4);
    for (let i = 1; i < onsets.length; i++) {
      const delta = onsets[i] - onsets[i - 1];
      expect(delta).toBeGreaterThan(4 * STEP - TOL);
      expect(delta).toBeLessThan(4 * STEP + TOL);
    }
    // High-pass keeps the click transients audible rather than silencing them.
    expect(rmsInWindow(buffer, onsets[0], onsets[0] + 0.02)).toBeGreaterThan(
      0.02,
    );
  });
});
