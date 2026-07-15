/**
 * Browser tests for loadKit's KitLoadResult (decision 5 in
 * docs/preset-persistence.md).
 *
 * A failed load must resolve "failed" while leaving the engine on the
 * previous kit with unpoisoned retained descriptors: renderWav and
 * rebuild re-create channels from those descriptors, so both must keep
 * targeting the last kit that actually loaded. A load superseded by a
 * newer one must resolve "superseded" while the winner resolves "loaded".
 */

import { beforeAll, describe, expect, it } from "vitest";

import type { KitSampleDescriptor } from "@/core/audio/engine/audio-engine";
import { findOnsets } from "@/test/analysis";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
} from "@/test/fixtures";
import { createFixtureEngine } from "@/test/render";

const BPM = 120;
const SAMPLE_RATE = 44100;

let clickUrl: string;

beforeAll(() => {
  clickUrl = makeClickSampleUrl();
});

describe("kit load failure (decision 5)", () => {
  it('resolves "failed" and keeps the previous kit and retained descriptors intact', async () => {
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
      const baselineOnsets = findOnsets(await engine.renderWav(renderOptions));
      expect(baselineOnsets).toHaveLength(5);

      let kitLoadedEvents = 0;
      engine.onKitLoaded(() => {
        kitLoadedEvents += 1;
      });

      // A bad kit whose second sample path fails to resolve, like a 404ing
      // sample would.
      const badKit: KitSampleDescriptor[] = [
        { instrumentId: "bad-0", samplePath: "bad-sample-0.wav", role: "kick" },
        {
          instrumentId: "bad-1",
          samplePath: "bad-sample-1.wav",
          role: "snare",
        },
      ];
      const result = await engine.loadKit(badKit, async (path: string) => {
        if (path === "bad-sample-1.wav") {
          throw new Error("sample not found");
        }
        return { url: clickUrl };
      });

      expect(result).toBe("failed");
      expect(kitLoadedEvents).toBe(0);

      // The previous kit's channels are still live.
      expect(engine.isChannelReady(0)).toBe(true);
      expect(engine.isChannelReady(1)).toBe(true);

      // Retained descriptors are unpoisoned: renderWav re-creates channels
      // from them, so a poisoned retention would reject (bad resolver) - it
      // must still render the old kit's onsets instead.
      const afterFailure = findOnsets(await engine.renderWav(renderOptions));
      expect(afterFailure).toHaveLength(baselineOnsets.length);

      // rebuild() reloads from the same retained descriptors and must also
      // land back on the old kit.
      await engine.rebuild();
      expect(engine.isChannelReady(0)).toBe(true);
      expect(engine.isChannelReady(1)).toBe(true);
      const afterRebuild = findOnsets(await engine.renderWav(renderOptions));
      expect(afterRebuild).toHaveLength(baselineOnsets.length);
    } finally {
      engine.dispose();
    }
  });

  it('resolves "superseded" for the losing load and "loaded" for the winner', async () => {
    const instruments = [makeInstrument(0, "kick"), makeInstrument(1, "snare")];
    const engine = await createFixtureEngine({
      pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
      instruments,
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    });

    try {
      let kitLoadedEvents = 0;
      engine.onKitLoaded(() => {
        kitLoadedEvents += 1;
      });

      const resolver = async () => ({ url: clickUrl });
      const descriptors = instruments.map((instrument) => ({
        instrumentId: instrument.meta.id,
        samplePath: instrument.sample.path,
        role: instrument.role,
      }));

      // The second call bumps loadSeq synchronously, so the first is
      // superseded regardless of which resolver settles first.
      const loser = engine.loadKit(descriptors, resolver);
      const winner = engine.loadKit(descriptors, resolver);

      await expect(loser).resolves.toBe("superseded");
      await expect(winner).resolves.toBe("loaded");
      expect(kitLoadedEvents).toBe(1);
    } finally {
      engine.dispose();
    }
  });
});
