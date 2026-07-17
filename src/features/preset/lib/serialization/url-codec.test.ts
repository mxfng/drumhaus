/**
 * Share-URL codec: latest-only version dispatch, canonical round-trip
 * tolerance, and typed decode failures.
 *
 * There is one share codec (compact.ts). A payload at the single current
 * COMPACT_CODEC_VERSION decodes; every other `v` - older v1.5 links and
 * versionless pre-#269 links - is refused with UnsupportedVersionError
 * (#373). Saved `.dh` files still migrate old formats through the document
 * ladder; that is exercised by the document tests, not here.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  CorruptFieldError,
  decodePresetFileText,
  InvalidFileError,
  migrateV1ToDocument,
  UnknownKitError,
  UnsupportedVersionError,
  type PresetDocument,
} from "@/features/preset/document";
import { buildDenseSharePreset } from "./__fixtures__/dense-preset";
import {
  COMPACT_CODEC_VERSION,
  encodeCompactDocument,
  type CompactPreset,
} from "./compact";
import { compress } from "./compress";
import { shareableDocumentToUrl, urlToDocument } from "./index";

// --- Helpers ----------------------------------------------------------------

function documentFixture(name: string): string {
  return readFileSync(
    new URL(`../../document/__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

/**
 * Assert two documents survive a share round trip within the codec's declared
 * CANONICAL tolerance.
 *
 * The codec is deliberately lossy to save URL bytes: each canonical numeric
 * field is quantized to a fixed number of decimals (compact.ts PRECISION), so
 * a round trip perturbs a field by at most one grid step of 10^-p canonical
 * units in that field's own unit (seconds, dB, Hz, semitones, 0..1 fraction).
 * We compare each field against that canonical epsilon directly - there is no
 * knob-space conversion anywhere in this assertion. Integer-carried fields
 * (compRatio) and untouched fields (bpm, kit id, name, pattern structure,
 * chain) are lossless and compared for exact equality; velocities share the
 * pattern codec's 0-100 quantization (a 0.005 fraction epsilon).
 */
function expectCanonicalRoundTrip(
  actual: PresetDocument,
  expected: PresetDocument,
): void {
  // Lossless fields: exact equality.
  expect(actual.kit.id).toBe(expected.kit.id);
  expect(actual.meta.id).toBe(expected.meta.id);
  expect(actual.meta.name).toBe(expected.meta.name);
  expect(actual.playback).toEqual(expected.playback);
  expect(actual.transport.bpm).toBe(expected.transport.bpm);
  expect(actual.master.compRatio).toBe(expected.master.compRatio);

  // Pattern: exact except velocities, which share the 0-100 quantization.
  actual.pattern.voices.forEach((voice, v) => {
    const expectedVoice = expected.pattern.voices[v];
    expect(voice.instrumentIndex).toBe(expectedVoice.instrumentIndex);
    voice.variations.forEach((seq, q) => {
      const expectedSeq = expectedVoice.variations[q];
      expect(seq.triggers).toEqual(expectedSeq.triggers);
      expect(seq.ratchets).toEqual(expectedSeq.ratchets);
      expect(seq.flams).toEqual(expectedSeq.flams);
      expect(seq.timingNudge).toBe(expectedSeq.timingNudge);
      seq.velocities.forEach((velocity, s) => {
        expect(
          Math.abs(velocity - expectedSeq.velocities[s]),
        ).toBeLessThanOrEqual(0.005);
      });
    });
  });
  expect(actual.pattern.variationMetadata).toEqual(
    expected.pattern.variationMetadata,
  );

  // Lossy canonical fields: within one quantization grid step (10^-p) of the
  // field's own canonical unit. `decimals` is the PRECISION for that field.
  const closeTo = (a: number, b: number, decimals: number, label: string) =>
    expect(Math.abs(a - b), label).toBeLessThanOrEqual(10 ** -decimals);

  actual.channels.forEach((channel, i) => {
    const expectedChannel = expected.channels[i];
    closeTo(
      channel.decaySeconds,
      expectedChannel.decaySeconds,
      7,
      `channel ${i} decay (s)`,
    );
    expect(channel.filter.side, `channel ${i} filter side`).toBe(
      expectedChannel.filter.side,
    );
    closeTo(
      channel.filter.cutoffHz,
      expectedChannel.filter.cutoffHz,
      3,
      `channel ${i} cutoff (Hz)`,
    );
    if (expectedChannel.volumeDb === null) {
      expect(channel.volumeDb, `channel ${i} volume`).toBeNull();
    } else {
      closeTo(
        channel.volumeDb!,
        expectedChannel.volumeDb,
        2,
        `channel ${i} volume (dB)`,
      );
    }
    closeTo(channel.pan, expectedChannel.pan, 4, `channel ${i} pan`);
    closeTo(
      channel.tuneSemitones,
      expectedChannel.tuneSemitones,
      3,
      `channel ${i} tune (semitones)`,
    );
    expect(channel.solo, `channel ${i} solo`).toBe(expectedChannel.solo);
    expect(channel.mute, `channel ${i} mute`).toBe(expectedChannel.mute);
  });

  const am = actual.master;
  const em = expected.master;
  expect(am.filter.side, "master filter side").toBe(em.filter.side);
  closeTo(am.filter.cutoffHz, em.filter.cutoffHz, 3, "master cutoff (Hz)");
  closeTo(am.saturation, em.saturation, 4, "master saturation");
  closeTo(am.phaser, em.phaser, 4, "master phaser");
  closeTo(am.reverb, em.reverb, 4, "master reverb");
  closeTo(
    am.compThresholdDb,
    em.compThresholdDb,
    2,
    "master compThreshold (dB)",
  );
  closeTo(
    am.compAttackSeconds,
    em.compAttackSeconds,
    8,
    "master compAttack (s)",
  );
  closeTo(am.compMix, em.compMix, 4, "master compMix");
  if (em.masterVolumeDb === null) {
    expect(am.masterVolumeDb, "master volume").toBeNull();
  } else {
    closeTo(am.masterVolumeDb!, em.masterVolumeDb, 2, "master volume (dB)");
  }

  closeTo(actual.transport.swing, expected.transport.swing, 4, "swing");
}

/** A schema-valid dense synthetic document exercising every codec spelling. */
function buildDenseSyntheticDocument(): PresetDocument {
  const document = migrateV1ToDocument(buildDenseSharePreset());
  return {
    ...document,
    channels: document.channels.map((channel, i) => ({
      ...channel,
      // Off-grid canonical values that must round-trip within tolerance.
      decaySeconds: 0.005 + i * 0.61234567891,
      filter: {
        side: i % 2 === 0 ? ("lowpass" as const) : ("highpass" as const),
        cutoffHz: 300 + i * 1234.5,
      },
      volumeDb: i === 0 ? null : -45.123456789 + i * 6.2,
      pan: -1 + i * 0.2857142857,
      tuneSemitones: -7 + i * 1.9876543,
      solo: i % 3 === 0,
      mute: i % 2 === 1,
    })) as PresetDocument["channels"],
    playback: {
      // Max chain: 8 steps, max repeats.
      chain: {
        steps: Array.from({ length: 8 }, (_, i) => ({
          variation: (i % 4) as 0 | 1 | 2 | 3,
          repeats: 8 - (i % 3),
        })),
      },
      chainEnabled: true,
    },
    transport: { bpm: 173.5, swing: 0.31415926 },
    master: {
      filter: { side: "highpass", cutoffHz: 6180.3398875 },
      saturation: 0.123456789,
      phaser: 0.987654321,
      reverb: 0.5555555,
      compThresholdDb: -13.579246,
      compRatio: 7,
      compAttackSeconds: 0.001 + 0.012345678,
      compMix: 0.246813579,
      masterVolumeDb: null,
    },
  };
}

/** Build a compressed ?p= payload from an arbitrary JSON value. */
function payloadOf(value: unknown): string {
  return compress(JSON.stringify(value));
}

function validPayload(): CompactPreset {
  return encodeCompactDocument(buildDenseSyntheticDocument());
}

// --- Round-trips --------------------------------------------------------------

describe("share codec round-trips within its canonical quantization", () => {
  const eraFixtures = [
    "v1-current.json",
    "v1-legacy-cycle.json",
    "v1-legacy-master.json",
    "v1-legacy-params.json",
    "v1-legacy-pattern-array.json",
  ];

  for (const fixture of eraFixtures) {
    it(`round-trips the migrated document of ${fixture}`, () => {
      const original = decodePresetFileText(documentFixture(fixture));
      const decoded = urlToDocument(shareableDocumentToUrl(original));
      expectCanonicalRoundTrip(decoded, original);
    });
  }

  it("round-trips a dense synthetic document (null volumes, max chain)", () => {
    const original = buildDenseSyntheticDocument();
    const decoded = urlToDocument(shareableDocumentToUrl(original));

    expectCanonicalRoundTrip(decoded, original);
    expect(decoded.channels[0].volumeDb).toBeNull();
    expect(decoded.master.masterVolumeDb).toBeNull();
    expect(decoded.playback.chain.steps).toHaveLength(8);
  });

  it("encodes the stable kit id and the current codec version", () => {
    const compact = validPayload();
    expect(compact.v).toBe(3);
    expect(compact.v).toBe(COMPACT_CODEC_VERSION);
    expect(compact.k).toBe("kit-3");
  });
});

// --- Typed decode failures ----------------------------------------------------

describe("urlToDocument typed failures", () => {
  it("refuses a versionless (pre-#269) payload with UnsupportedVersionError", () => {
    // A hand-built truncated legacy payload: valid compact structure, no v.
    const legacy = {
      id: "legacy",
      k: "0",
      n: "Old Link",
      ip: [{}, {}, {}, {}, {}, {}, {}, {}],
      pt: [],
    };
    expect(() => urlToDocument(payloadOf(legacy))).toThrow(
      UnsupportedVersionError,
    );
  });

  it("refuses an old v1.5 knob-space link with UnsupportedVersionError", () => {
    // Post-#269 v1.5 links are no longer read (#373): the share codec is
    // latest-only and carries no legacy decoder.
    const v15 = {
      v: 1.5,
      id: "old",
      k: "0",
      n: "v1.5 Link",
      ip: [{}, {}, {}, {}, {}, {}, {}, {}],
      pt: [],
    };
    expect(() => urlToDocument(payloadOf(v15))).toThrow(
      UnsupportedVersionError,
    );
  });

  it("refuses the superseded, ambiguous v: 2 payload with UnsupportedVersionError", () => {
    // v: 2 labeled two incompatible filter shapes across the unreleased #357
    // epic (#368); the single codec refuses it uniformly rather than decoding.
    expect(() => urlToDocument(payloadOf({ ...validPayload(), v: 2 }))).toThrow(
      UnsupportedVersionError,
    );
  });

  it("refuses unknown future versions with UnsupportedVersionError", () => {
    expect(() =>
      urlToDocument(
        payloadOf({ ...validPayload(), v: COMPACT_CODEC_VERSION + 1 }),
      ),
    ).toThrow(UnsupportedVersionError);
  });

  it("rejects garbage payloads with InvalidFileError", () => {
    expect(() => urlToDocument("!!!not-a-payload!!!")).toThrow(
      InvalidFileError,
    );
  });

  it("rejects a short ip array with CorruptFieldError at ip", () => {
    const payload = { ...validPayload(), ip: [{}, {}] };
    expect(() => urlToDocument(payloadOf(payload))).toThrow(CorruptFieldError);
    try {
      urlToDocument(payloadOf(payload));
    } catch (error) {
      expect((error as CorruptFieldError).path).toBe("ip");
    }
  });

  it("rejects a short pt array with CorruptFieldError at pt", () => {
    const payload = {
      ...validPayload(),
      pt: validPayload().pt.slice(0, 3),
    };
    try {
      urlToDocument(payloadOf(payload));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe("pt");
    }
  });

  it("rejects a corrupt trigger bitmap with a step-level path", () => {
    const payload = validPayload();
    payload.pt[2].a.t = "zzzz";
    try {
      urlToDocument(payloadOf(payload));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe("pt.2.a.t");
    }
  });

  it("rejects an out-of-range velocity step index", () => {
    const payload = validPayload();
    payload.pt[0].a.v = { "-1": 50 };
    try {
      urlToDocument(payloadOf(payload));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe("pt.0.a.v.-1");
    }
  });

  it("rejects a malformed chain string with CorruptFieldError at ch", () => {
    const payload = { ...validPayload(), ch: "A2Q9" };
    try {
      urlToDocument(payloadOf(payload));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe("ch");
    }
  });

  it("rejects an unknown kit id with UnknownKitError", () => {
    const payload = { ...validPayload(), k: "kit-99" };
    try {
      urlToDocument(payloadOf(payload));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownKitError);
      expect((error as UnknownKitError).kitId).toBe("kit-99");
    }
  });

  it("rejects out-of-range domain values via the schema with a document path", () => {
    const payload = validPayload();
    payload.ip[0] = { ...payload.ip[0], v: 99 }; // volumeDb max is 4
    try {
      urlToDocument(payloadOf(payload));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe("channels.0.volumeDb");
    }
  });
});
