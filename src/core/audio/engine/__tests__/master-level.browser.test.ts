/**
 * Browser tests for the master output level tap (issue #268).
 *
 * Pins the tap's whole contract: silence reporting, lazy creation before
 * init, staying functional across rebuild() (the doInit reattachment
 * path), and reading actual loudness during live playback. The last one
 * needs the live graph initialized (initLiveGraph) - an uninitialized
 * engine has no master bus, so its channels feed nothing and the tap
 * reads -Infinity forever (the harness gap behind issue #348).
 */

import { getContext } from "tone/build/esm/index";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { AudioEngine } from "@/core/audio/engine";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
  makeToneSampleUrl,
} from "@/test/fixtures";
import { createFixtureEngine } from "@/test/render";

/** Anything at or below this reads as silence for the tap's consumers. */
const SILENCE_DB = -60;

function makeEngine() {
  return createFixtureEngine({
    pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
    instruments: [makeInstrument(0, "kick")],
    sampleUrls: [makeClickSampleUrl()],
    bpm: 120,
  });
}

describe("master output level tap", () => {
  it("reports silence before the engine is initialized", () => {
    const engine = new AudioEngine();
    try {
      // Lazy meter creation with no master bus yet: silence, no throw.
      expect(engine.getMasterLevelDb()).toBeLessThanOrEqual(SILENCE_DB);
    } finally {
      engine.dispose();
    }
  });

  it("reports silence when the engine is idle", async () => {
    const engine = await makeEngine();
    try {
      expect(engine.getMasterLevelDb()).toBeLessThanOrEqual(SILENCE_DB);
    } finally {
      engine.dispose();
    }
  });

  it("stays functional across rebuild()", async () => {
    const engine = await makeEngine();
    try {
      // First poll creates the meter against the original bus.
      expect(engine.getMasterLevelDb()).toBeLessThanOrEqual(SILENCE_DB);

      await engine.rebuild();

      // The retained meter was reconnected to the replacement bus and
      // still reports a valid level.
      expect(engine.getMasterLevelDb()).toBeLessThanOrEqual(SILENCE_DB);
    } finally {
      engine.dispose();
    }
  });

  it("reads loudness during live playback", async () => {
    // A sustained tone (not a 10ms click) so every unsmoothed RMS window
    // during playback is loud - the assertion cannot miss the signal.
    const engine = await createFixtureEngine({
      pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [makeToneSampleUrl()],
      bpm: 120,
      initLiveGraph: true,
    });
    try {
      // Trusted user gesture so the AudioContext is allowed to start.
      await userEvent.click(document.body);
      await engine.play();
      expect(getContext().state).toBe("running");

      const start = performance.now();
      let level = -Infinity;
      while (level <= SILENCE_DB) {
        if (performance.now() - start > 8000) {
          // Include transport/context diagnostics so a failure here is
          // self-describing (running-but-silent vs stalled clock).
          throw new Error(
            `timed out waiting for the master tap to read signal (last ${level} dB; ` +
              `diagnostics ${JSON.stringify(engine.getDiagnostics())})`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
        level = engine.getMasterLevelDb();
      }
      expect(level).toBeGreaterThan(SILENCE_DB);
    } finally {
      engine.stop();
      engine.dispose();
    }
  }, 20000);
});
