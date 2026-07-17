/**
 * The share compact codec carries the canonical split filter as a
 * `[sideCode, cutoffHz]` pair. These tests pin that the filter round-trips
 * through encode -> decode and that a malformed pair fails typed.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import {
  CorruptFieldError,
  migrateV1ToDocument,
  parsePresetFileV1,
  type PresetDocument,
} from "@/features/preset/document";
import { decodeCompactDocument, encodeCompactDocument } from "./compact";

function baseDocument(): PresetDocument {
  const text = readFileSync(
    new URL("../../document/__fixtures__/v1-current.json", import.meta.url),
    "utf-8",
  );
  return migrateV1ToDocument(parsePresetFileV1(text));
}

function withFilters(
  channel0: CanonicalFilter,
  master: CanonicalFilter,
): PresetDocument {
  const document = baseDocument();
  return {
    ...document,
    channels: document.channels.map((channel, index) =>
      index === 0 ? { ...channel, filter: channel0 } : channel,
    ) as PresetDocument["channels"],
    master: { ...document.master, filter: master },
  };
}

const CASES: CanonicalFilter[] = [
  { side: "lowpass", cutoffHz: 0 },
  { side: "lowpass", cutoffHz: 2498.959 },
  { side: "lowpass", cutoffHz: 15000 },
  { side: "highpass", cutoffHz: 0 },
  { side: "highpass", cutoffHz: 1405.664 },
  { side: "highpass", cutoffHz: 9876.543 },
];

describe("compact filter round-trip", () => {
  it.each(CASES)("round-trips channel and master filter %o", (filter) => {
    const document = withFilters(filter, filter);
    const decoded = decodeCompactDocument(encodeCompactDocument(document));

    expect(decoded.channels[0].filter.side).toBe(filter.side);
    expect(decoded.channels[0].filter.cutoffHz).toBeCloseTo(filter.cutoffHz, 3);
    expect(decoded.master.filter.side).toBe(filter.side);
    expect(decoded.master.filter.cutoffHz).toBeCloseTo(filter.cutoffHz, 3);
  });

  it("omits a default-equal filter but still decodes it to the default", () => {
    const document = baseDocument();
    const compact = encodeCompactDocument(document);
    // The init master filter equals the sparse baseline, so `mc.f` is omitted.
    expect(compact.mc?.f).toBeUndefined();
    const decoded = decodeCompactDocument(compact);
    expect(decoded.master.filter).toEqual(document.master.filter);
  });

  it("rejects a malformed filter pair", () => {
    const document = withFilters(
      { side: "lowpass", cutoffHz: 1000 },
      { side: "highpass", cutoffHz: 2000 },
    );
    const compact = encodeCompactDocument(document);
    (compact.mc as { f: unknown }).f = [2, 5000]; // invalid side code
    expect(() => decodeCompactDocument(compact)).toThrow(CorruptFieldError);
  });
});
