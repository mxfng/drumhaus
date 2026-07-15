/**
 * Render-path smoke for a NON-default split-filter position.
 *
 * The golden renders (golden-render.browser.test.ts) only exercise the
 * centered filter (knob 50), so the derived LP/HP node targets for an engaged
 * filter never go through an offline render there. This drives a high-pass
 * position through the real render path and confirms it still renders a stable,
 * audible four-on-the-floor - a broadband regression guard complementing the
 * exact-value unit test in split-filter.test.ts.
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
      // Knob 70 sits on the high-pass side (>50), so the derivation opens the
      // low-pass node to the range max and tracks the cutoff on the high-pass.
      masterParams: { filter: 70 },
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
