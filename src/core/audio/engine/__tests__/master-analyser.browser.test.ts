/**
 * Browser tests for the master spectrum analyser tap (issue #384).
 *
 * The visualizer polls getMasterAnalyser().getValue() from its animation
 * loop. These tests pin the tap's contract: it returns a working "fft"
 * analyser, the instance is stable across calls, it survives rebuild()
 * (the doInit reattachment path), and it sees actual spectrum content
 * during live playback. The last one needs the live graph initialized
 * (initLiveGraph) - an uninitialized engine has no master bus, so the tap
 * observes silence forever (the harness gap behind issue #348).
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

  it("sees spectrum content during live playback", async () => {
    // A sustained tone so the FFT holds strong bins for the whole poll
    // window (a 10ms click could fall between reads).
    const engine = await createFixtureEngine({
      pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [makeToneSampleUrl()],
      bpm: 120,
      initLiveGraph: true,
    });
    try {
      const analyser = engine.getMasterAnalyser();

      // Trusted user gesture so the AudioContext is allowed to start.
      await userEvent.click(document.body);
      await engine.play();
      expect(getContext().state).toBe("running");

      const start = performance.now();
      let peakBinDb = -Infinity;
      while (peakBinDb <= -60) {
        if (performance.now() - start > 8000) {
          // Include transport/context diagnostics so a failure here is
          // self-describing (running-but-silent vs stalled clock).
          throw new Error(
            `timed out waiting for spectrum content (peak bin ${peakBinDb} dB; ` +
              `diagnostics ${JSON.stringify(engine.getDiagnostics())})`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
        const bins = analyser.getValue() as Float32Array;
        for (const bin of bins) {
          if (bin > peakBinDb) peakBinDb = bin;
        }
      }
      expect(peakBinDb).toBeGreaterThan(-60);
    } finally {
      engine.stop();
      engine.dispose();
    }
  }, 20000);
});
