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
    // TEMP CI INSTRUMENTATION for the #348 fix - dumps a stage-by-stage
    // bisection when the graph wedges silent on CI.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const stateAtCreate = getContext().state;
    // A sustained tone (not a 10ms click) so every unsmoothed RMS window
    // during playback is loud - the assertion cannot miss the signal.
    const engine = await createFixtureEngine({
      pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
      instruments: [makeInstrument(0, "kick")],
      sampleUrls: [makeToneSampleUrl()],
      bpm: 120,
      initLiveGraph: true,
    });
    // Count channel triggers.
    const ch = (engine as any).channels[0];
    let triggerCount = 0;
    const origTrigger = ch.trigger.bind(ch);
    ch.trigger = (time: number, hit: unknown) => {
      triggerCount++;
      return origTrigger(time, hit);
    };
    try {
      const stateBeforeClick = getContext().state;
      // Trusted user gesture so the AudioContext is allowed to start.
      await userEvent.click(document.body);
      await engine.play();
      expect(getContext().state).toBe("running");

      const start = performance.now();
      let level = -Infinity;
      while (level <= SILENCE_DB) {
        if (performance.now() - start > 8000) {
          const cs = ch?.envelopeNode?._sig?._constantSource;
          const raw: AudioContext = (getContext() as any).rawContext
            ._nativeAudioContext;
          const tap = () => {
            const a = raw.createAnalyser();
            a.fftSize = 2048;
            return a;
          };
          const taps: Record<string, AnalyserNode> = {
            sampler: tap(),
            envelope: tap(),
            panner: tap(),
          };
          ch.samplerNode.connect(taps.sampler);
          ch.envelopeNode.connect(taps.envelope);
          ch.pannerNode.connect(taps.panner);
          const maxRms: Record<string, number> = {};
          const buf = new Float32Array(2048);
          const tapStart = performance.now();
          while (performance.now() - tapStart < 2600) {
            for (const [name, a] of Object.entries(taps)) {
              a.getFloatTimeDomainData(buf);
              let sum = 0;
              for (const v of buf) sum += v * v;
              const rms = Math.sqrt(sum / buf.length);
              if (!(name in maxRms) || rms > maxRms[name]) maxRms[name] = rms;
            }
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          throw new Error(
            `timed out waiting for the master tap to read signal (last ${level} dB; ` +
              `diagnostics ${JSON.stringify({
                ...engine.getDiagnostics(),
                stateAtCreate,
                stateBeforeClick,
                triggerCount,
                samplerLoaded: ch.samplerNode.loaded,
                envConstHasNative: !!cs?._source,
                envConstState: cs?.state,
                maxRms,
              })})`,
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
