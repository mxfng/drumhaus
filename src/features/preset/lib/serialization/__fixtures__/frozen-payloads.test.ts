/**
 * Frozen share-payload fixtures for the current compact codec (v3).
 *
 * `share-v3-init.txt` and `share-v3-dense.txt` are real `?p=` payload strings
 * emitted by today's `shareableDocumentToUrl` (compact codec v3, gzip,
 * base64url). They are frozen on disk so a future codec edit is caught against
 * the actual bytes a build emitted, not only against in-memory round trips:
 * `url-codec.test.ts` proves encode->decode is self-consistent, but a change
 * that alters BOTH sides in lockstep would pass there while silently breaking
 * every link already in the wild. Decoding these captured bytes to a pinned
 * document closes that gap (the deleted `share-v1_5-*.txt` fixtures did the
 * same for the retired v1.5 codec before the latest-only collapse, #373).
 *
 * The decoded values below are pinned literals, not values read back from the
 * codec under test. The codec is deliberately lossy (compact.ts PRECISION), so
 * quantized fields are pinned to their emitted grid values. See
 * __fixtures__/README.md for provenance and how to regenerate.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { urlToDocument } from "../index";

function readPayload(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf-8").trim();
}

describe("frozen v3 share payloads", () => {
  it("share-v3-init.txt decodes to the pinned init document", () => {
    const document = urlToDocument(readPayload("share-v3-init.txt"));

    expect(document.version).toBe(2.1);
    expect(document.kit.id).toBe("kit-0");
    expect(document.meta.name).toBe("init");
    expect(document.transport).toEqual({ bpm: 100, swing: 0 });

    // Default init channels: neutral filter (position 50 -> highpass at 0 Hz),
    // 0 dB volume, centered pan and tune.
    document.channels.forEach((channel) => {
      expect(channel.filter).toEqual({ side: "highpass", cutoffHz: 0 });
      expect(channel.volumeDb).toBe(0);
      expect(channel.pan).toBe(0);
      expect(channel.tuneSemitones).toBe(0);
      expect(channel.decaySeconds).toBe(5);
    });

    expect(document.master.filter).toEqual({ side: "highpass", cutoffHz: 0 });
    expect(document.master.masterVolumeDb).toBe(0);
    expect(document.master.compRatio).toBe(5);

    // init ships a single-step chain, disabled.
    expect(document.playback.chainEnabled).toBe(false);
    expect(document.playback.chain.steps).toEqual([
      { variation: 0, repeats: 1 },
    ]);
  });

  it("share-v3-dense.txt decodes to the pinned dense document", () => {
    const document = urlToDocument(readPayload("share-v3-dense.txt"));

    expect(document.version).toBe(2.1);
    expect(document.kit.id).toBe("kit-3");
    expect(document.meta.name).toBe("Dense Fixture");
    expect(document.transport.bpm).toBe(137);
    // v1.5 swing knob 64 through the legacy interpretation, quantized.
    expect(document.transport.swing).toBeCloseTo(0.24, 6);

    // Channel 0 pins the null (silence) volume spelling and the lossy quantized
    // domain values the codec emits.
    const ch0 = document.channels[0];
    expect(ch0.volumeDb).toBeNull();
    expect(ch0.filter.side).toBe("lowpass");
    expect(ch0.filter.cutoffHz).toBeCloseTo(899.625, 3);
    expect(ch0.decaySeconds).toBeCloseTo(0.0174875, 7);
    expect(ch0.pan).toBeCloseTo(-0.92, 6);
    expect(ch0.tuneSemitones).toBeCloseTo(-6.16, 6);

    // A high-position channel filter and the master filter, both low-pass.
    expect(document.channels[3].filter.side).toBe("lowpass");
    expect(document.channels[3].filter.cutoffHz).toBeCloseTo(12650.979, 3);
    expect(document.master.filter.side).toBe("lowpass");
    expect(document.master.filter.cutoffHz).toBeCloseTo(6003.748, 3);

    // Master pins the null master-volume spelling and the integer compRatio.
    expect(document.master.masterVolumeDb).toBeNull();
    expect(document.master.compRatio).toBe(6);

    // The 3-step chain (A2 B1 D3), enabled.
    expect(document.playback.chainEnabled).toBe(true);
    expect(document.playback.chain.steps).toEqual([
      { variation: 0, repeats: 2 },
      { variation: 1, repeats: 1 },
      { variation: 3, repeats: 3 },
    ]);
  });
});
