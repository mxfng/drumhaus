/**
 * The v2 -> v2.1 document migration: a version-2 domain document (split
 * filter as a 0-100 position) migrating to v2.1 (split filter as canonical
 * `{ side, cutoffHz }`), including the decode-dispatch path.
 */

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { decodePresetFileText } from "./decode";
import type { PresetDocument } from "./document";
import { CorruptFieldError } from "./errors";
import { frozenSplitFilterPositionToCanonical } from "./frozen-split-filter";
import { migrateV1ToDocument } from "./migrate-v1";
import { migrateV2ToDocument } from "./migrate-v2";
import { parsePresetFileV1 } from "./parse";

function readFixture(name: string): string {
  return readFileSync(
    new URL(`./__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

/** Distinct filter positions per channel so each side/cutoff is exercised. */
const CHANNEL_FILTER_POSITIONS = [0, 20, 49, 50, 51, 80, 100, 35];
const MASTER_FILTER_POSITION = 65;

/**
 * A real version-2 document: the current migration's v2.1 surface, downgraded
 * to the v2 shape (version 2, split filter as a 0-100 position). Building it
 * from the live migration keeps every non-filter field schema-valid without
 * pinning a large literal, while the filter positions are set explicitly so
 * the migration's conversion is meaningfully exercised.
 */
function buildV2Document(): Record<string, unknown> {
  const v21 = migrateV1ToDocument(
    parsePresetFileV1(readFixture("v1-current.json")),
  );
  const channels = v21.channels.map((channel, index) => ({
    ...channel,
    filter: CHANNEL_FILTER_POSITIONS[index],
  }));
  return {
    ...v21,
    version: 2,
    channels,
    master: { ...v21.master, filter: MASTER_FILTER_POSITION },
  };
}

describe("migrateV2ToDocument", () => {
  it("converts every channel and master filter position to canonical", () => {
    const document = migrateV2ToDocument(buildV2Document());

    expect(document.version).toBe(2.1);
    document.channels.forEach((channel, index) => {
      expect(channel.filter).toEqual(
        frozenSplitFilterPositionToCanonical(CHANNEL_FILTER_POSITIONS[index]),
      );
    });
    expect(document.master.filter).toEqual(
      frozenSplitFilterPositionToCanonical(MASTER_FILTER_POSITION),
    );
  });

  it("preserves the low-pass / high-pass split across the center", () => {
    const document = migrateV2ToDocument(buildV2Document());
    // Positions 0, 20, 49 are low-pass; 50, 51, 80, 100 are high-pass.
    expect(document.channels[0].filter.side).toBe("lowpass");
    expect(document.channels[2].filter.side).toBe("lowpass");
    expect(document.channels[3].filter.side).toBe("highpass");
    expect(document.channels[6].filter.side).toBe("highpass");
  });

  it("leaves the non-filter fields untouched", () => {
    const v2 = buildV2Document();
    const document = migrateV2ToDocument(v2);
    const v2Channel = (v2.channels as Record<string, unknown>[])[0];
    expect(document.channels[0].decaySeconds).toBe(v2Channel.decaySeconds);
    expect(document.channels[0].volumeDb).toBe(v2Channel.volumeDb);
    expect(document.transport).toEqual(v2.transport);
  });

  it("rejects a non-numeric filter position", () => {
    const v2 = buildV2Document();
    (v2.master as Record<string, unknown>).filter = "loud";
    expect(() => migrateV2ToDocument(v2)).toThrow(CorruptFieldError);
  });

  it("is reached by decodePresetFileText for a v2 document", () => {
    const document: PresetDocument = decodePresetFileText(
      JSON.stringify(buildV2Document()),
    );
    expect(document.version).toBe(2.1);
    expect(document.master.filter).toEqual(
      frozenSplitFilterPositionToCanonical(MASTER_FILTER_POSITION),
    );
  });
});

describe("migrateV2ToDocument - strip warning", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("strips an unknown v2 field on migrate and warns naming it", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const v2 = { ...buildV2Document(), legacyExtra: true };

    const document = migrateV2ToDocument(v2);

    expect("legacyExtra" in document).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("legacyExtra");
  });

  it("does not warn for a clean v2 document", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    migrateV2ToDocument(buildV2Document());

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
