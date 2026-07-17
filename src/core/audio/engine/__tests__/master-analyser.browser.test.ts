/**
 * Browser tests for the master spectrum analyser tap (issue #384).
 *
 * The visualizer polls getMasterAnalyser().getValue() from its animation
 * loop. These tests pin the tap's contract: it returns a working "fft"
 * analyser, the instance is stable across calls, and it survives
 * rebuild(), which exercises the doInit reattachment path.
 *
 * Spectrum content is deliberately not asserted in vitest browser mode -
 * see the harness note in master-level.browser.test.ts (issue #348).
 * Live loudness reaching the taps is covered end to end by the Playwright
 * suite (night-visualizer.spec.ts).
 */

import { describe, expect, it } from "vitest";

import { AudioEngine } from "@/core/audio/engine";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
} from "@/test/fixtures";
import { createFixtureEngine } from "@/test/render";

/** The FFT size getMasterAnalyser is configured with. */
const ANALYSER_SIZE = 512;

function makeEngine() {
  return createFixtureEngine({
    pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
    instruments: [makeInstrument(0, "kick")],
    sampleUrls: [makeClickSampleUrl()],
    bpm: 120,
  });
}

describe("master spectrum analyser tap", () => {
  it("returns a working analyser before the engine is initialized", () => {
    const engine = new AudioEngine();
    try {
      // Lazy creation with no master bus yet: an analyser, no throw.
      const analyser = engine.getMasterAnalyser();
      const data = analyser.getValue();
      expect(data.length).toBe(ANALYSER_SIZE);
    } finally {
      engine.dispose();
    }
  });

  it("returns the same instance across calls", async () => {
    const engine = await makeEngine();
    try {
      expect(engine.getMasterAnalyser()).toBe(engine.getMasterAnalyser());
    } finally {
      engine.dispose();
    }
  });

  it("stays functional across rebuild()", async () => {
    const engine = await makeEngine();
    try {
      // First poll creates the analyser against the original bus.
      const analyser = engine.getMasterAnalyser();
      expect(analyser.getValue().length).toBe(ANALYSER_SIZE);

      await engine.rebuild();

      // The retained analyser was reconnected to the replacement bus: same
      // instance, still reading a valid spectrum window.
      expect(engine.getMasterAnalyser()).toBe(analyser);
      expect(analyser.getValue().length).toBe(ANALYSER_SIZE);
    } finally {
      engine.dispose();
    }
  });
});
