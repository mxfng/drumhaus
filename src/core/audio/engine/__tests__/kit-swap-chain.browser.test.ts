/**
 * Live-playback regression test for issue #241: hot swapping kits must not
 * reset the variation chain position.
 *
 * Offline rendering cannot exercise this (every render builds a fresh
 * sequence), so this test drives a LIVE engine: real transport, real
 * AudioContext (unlocked via a trusted click, as headless Chromium's
 * autoplay policy makes context.resume() hang without user activation),
 * and a mid-playback loadKit exactly like the bridge issues when the
 * sample set changes.
 *
 * Assertions read the engine's onPlaybackVariationChange emissions, which
 * fire at sequence creation and at every bar start. The engine runs with a
 * live master bus (initLiveGraph), so the master level tap is asserted
 * non-silent during playback: live meters DO read signal under automation
 * once the graph is initialized and the pattern has hits (issue #348 - the
 * earlier "meters read silence in this harness" observation was this
 * harness skipping engine.init(), not an environment limit).
 */

import { getContext } from "tone/build/esm/index";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
} from "@/test/fixtures";
import { createFixtureEngine } from "@/test/render";

/** High tempo so bars pass quickly: one bar = 16 * (60/480/4)s = 500ms. */
const BPM = 480;
/** Wall-clock duration of one bar at BPM, in milliseconds. */
const BAR_MS = (60_000 / BPM) * 4;

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  label: string,
): Promise<void> {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeoutMs) {
      throw new Error(`timed out waiting for ${label}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("kit hot swap during chain playback (issue #241)", () => {
  it("preserves the chain position across a mid-playback loadKit", async () => {
    const clickUrl = makeClickSampleUrl();
    const instruments = [makeInstrument(0, "kick"), makeInstrument(1, "snare")];

    // Chain: one bar of variation A, then sixteen bars of variation B (8s
    // at 480 bpm, generous slack for slow CI). The kit swap lands inside
    // the B window; a chain reset would jump back to A immediately, which
    // was the pre-fix behavior (loadKit recreated the live sequence, whose
    // chain cursor lives for exactly one sequence lifetime).
    const engine = await createFixtureEngine({
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0 },
          ...[0, 4, 8, 12].map((step) => ({
            voice: 0,
            step,
            variation: 1 as const,
          })),
        ],
      }),
      instruments,
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
      chain: {
        steps: [
          { variation: 0, repeats: 1 },
          { variation: 1, repeats: 8 },
          { variation: 1, repeats: 8 },
        ],
      },
      chainEnabled: true,
      initLiveGraph: true,
    });

    const emissions: number[] = [];
    engine.onPlaybackVariationChange((variation) => emissions.push(variation));

    try {
      // Trusted user gesture so the AudioContext is allowed to start.
      await userEvent.click(document.body);
      await engine.play();
      expect(getContext().state).toBe("running");

      // Let the chain advance into its variation-B window.
      await waitFor(
        () => emissions.includes(1),
        8000,
        "the chain to reach variation B",
      );

      // The live graph is audible to the engine's own meters under
      // automation (issue #348): with clicks playing every quarter note,
      // the post-limiter master tap must catch a non-silent RMS window.
      await waitFor(
        () => engine.getMasterLevelDb() > -60,
        8000,
        "the master level tap to read signal",
      );

      // Hot swap the kit mid-playback (fresh descriptor array, same
      // samples), exactly like the bridge does when the sample set changes.
      const emissionCountBeforeSwap = emissions.length;
      const pathToUrl = new Map(
        instruments.map((instrument) => [instrument.sample.path, clickUrl]),
      );
      await engine.loadKit(
        instruments.map((instrument) => ({
          instrumentId: instrument.meta.id,
          samplePath: instrument.sample.path,
          role: instrument.role,
        })),
        async (path: string) => ({ url: pathToUrl.get(path) ?? path }),
      );

      // The swap landed: replacement channels are loaded.
      expect(engine.isChannelReady(0)).toBe(true);
      expect(engine.isChannelReady(1)).toBe(true);

      // Observe a few more bars, comfortably inside the B window.
      await new Promise((resolve) => setTimeout(resolve, 2.5 * BAR_MS));

      // Playback must have continued across the swap (bar starts still
      // fire)...
      const appended = emissions.slice(emissionCountBeforeSwap);
      expect(appended.length).toBeGreaterThan(0);

      // ...and every emission from the swap call onward must still be
      // variation B: no synchronous variation-A emission at swap time (the
      // reset chain cursor re-announcing chain step 0) and no restarted
      // chain in the following bars.
      expect(appended).toEqual(Array(appended.length).fill(1));
    } finally {
      engine.stop();
      engine.dispose();
    }
  }, 20000);
});
