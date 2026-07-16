/**
 * Render-path smoke for a NON-default split-filter position (issue #363).
 *
 * The deterministic unit test (split-filter.test.ts) already pins the exact
 * `deriveSplitFilterFrequencies` node targets. This is the complementary
 * broadband guard: it renders REAL audio through the production offline path
 * with the MASTER split filter pushed to an engaged high-pass (knob 70) and
 * asserts the beat still comes out as a stable, audible four-on-the-floor.
 * knob 70 -> frozenSplitFilterPositionToCanonical -> { side: "highpass",
 * cutoffHz ~= 2499 } (position > 49 selects the high-pass side), so the
 * low-pass opens to the range max and the high-pass tracks ~2.5 kHz.
 *
 * ISOLATION / STABILITY NOTE (why this file is structured like golden-render):
 * PR B first added this file with the same assertions; it flaked ONCE on CI
 * headless chromium with a standardized-audio-context error -
 * "A value with the given key could not be found" - thrown from
 * getNativeAudioNode -> GainNode.connect inside connectMasterBusNodes
 * (master-bus.ts), i.e. during GENERIC master-bus Gain wiring, BEFORE any
 * filter value is applied. That location proves it is not a filter or engine
 * defect: it is standardized-audio-context's per-context node registry failing
 * to resolve a node's native counterpart. The trigger is browser-test
 * concurrency: vitest browser mode runs every *.browser.test.ts in the shared
 * chromium browser, and with file parallelism each offline-render suite spins
 * up real-time + OfflineAudioContexts that contend for the browser process's
 * audio subsystem. Adding a THIRD offline-render file raised that contention
 * and reshuffled scheduling; the new file lost the s-a-c registration race
 * once on a slower CI runner. golden-render / stem-render never regressed
 * because the flake is load/ordering dependent, not specific to their code.
 * The fix is two-part: (1) this file uses the IDENTICAL proven harness path
 * (renderFixture + the same beforeAll/const lifecycle as golden-render), with
 * no bespoke context handling; (2) the browser project runs test files
 * serially (test.fileParallelism: false in vitest.config.ts) so no two
 * offline-render files ever contend for AudioContext registration. That change
 * is scheduling-only - it cannot change a single rendered byte, so golden and
 * stem output stay byte-identical.
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
/** Duration of one 16th note at 120 BPM. */
const STEP = 60 / BPM / 4; // 0.125s
/** Tolerance for onset-delta assertions. */
const TOL = 0.005;

/**
 * Master split-filter knob 70: an engaged high-pass. Positions 50-100 select
 * the high-pass side of the frozen curve; 70 lands at ~2.5 kHz cutoff, so the
 * sub/low-mids are attenuated while the click's bright transient survives.
 */
const HIGH_PASS_70 = { filter: 70 };

let clickUrl: string;

beforeAll(() => {
  clickUrl = makeClickSampleUrl();
});

function deltas(onsets: number[]): number[] {
  return onsets.slice(1).map((t, i) => t - onsets[i]);
}

describe("split filter: non-default position render", () => {
  it("renders a stable four-on-the-floor through an engaged high-pass", async () => {
    const buffer = await renderFixture({
      pattern: makePattern({
        steps: [0, 4, 8, 12].map((step) => ({ voice: 0, step })),
      }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [clickUrl],
      bpm: BPM,
      masterParams: HIGH_PASS_70,
    });

    const onsets = findOnsets(buffer);
    expect(onsets).toHaveLength(4);
    for (const delta of deltas(onsets)) {
      expect(delta).toBeGreaterThan(4 * STEP - TOL);
      expect(delta).toBeLessThan(4 * STEP + TOL);
    }
    // The engaged high-pass keeps the bright transient audible.
    expect(rmsInWindow(buffer, onsets[0], onsets[0] + 0.02)).toBeGreaterThan(
      0.02,
    );
  });
});
