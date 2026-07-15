/**
 * Browser tests for the master output level tap (issue #268).
 *
 * Live meters read silence in this headless harness (see the note in
 * kit-swap-chain.browser.test.ts), so loudness itself is not asserted.
 * These tests pin the tap's contract instead: silence reporting, lazy
 * creation before init, and staying functional across rebuild(), which
 * exercises the doInit reattachment path.
 */

import { describe, expect, it } from "vitest";

import { AudioEngine } from "@/core/audio/engine";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
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
});
