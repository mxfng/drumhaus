import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  migrateInstruments,
  migrateMasterChainParams,
  migratePattern,
} from "@/features/sequencer/lib/migrations";
import { UnknownKitError } from "./errors";
import { migrateV1ToDocument } from "./migrate-v1";
import { parsePresetFileV1, validatePresetFileV1 } from "./parse";
import { documentToV1 } from "./to-v1";

function readFixture(name: string): string {
  return readFileSync(
    new URL(`./__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

function migrateFixture(name: string) {
  return migrateV1ToDocument(parsePresetFileV1(readFixture(name)));
}

const ERA_FIXTURES = [
  "v1-current.json",
  "v1-legacy-params.json",
  "v1-legacy-master.json",
  "v1-legacy-cycle.json",
  "v1-legacy-pattern-array.json",
];

const NUMERIC_EPSILON = 1e-6;

/**
 * Deep equality with a numeric tolerance: the adapter's inverse mappings
 * introduce float noise well under 1e-6, and anything larger is a real
 * round-trip loss.
 */
function expectDeepClose(actual: unknown, expected: unknown, path: string) {
  if (typeof expected === "number") {
    expect(typeof actual, path).toBe("number");
    expect(Math.abs((actual as number) - expected), path).toBeLessThanOrEqual(
      NUMERIC_EPSILON,
    );
    return;
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, path).toBe(expected.length);
    expected.forEach((item, index) => {
      expectDeepClose((actual as unknown[])[index], item, `${path}[${index}]`);
    });
    return;
  }
  if (typeof expected === "object" && expected !== null) {
    expect(typeof actual, path).toBe("object");
    expect(actual, path).not.toBeNull();
    const expectedKeys = Object.keys(expected).sort();
    expect(Object.keys(actual as object).sort(), path).toEqual(expectedKeys);
    for (const key of expectedKeys) {
      expectDeepClose(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${path}.${key}`,
      );
    }
    return;
  }
  expect(actual, path).toBe(expected);
}

describe("document -> v1 -> document round trip", () => {
  // migrate(documentToV1(document)) must reproduce the document: the
  // adapter loses nothing the document cares about.
  it.each(ERA_FIXTURES)("%s survives the round trip", (name) => {
    const first = migrateFixture(name);
    const asV1 = documentToV1(first);
    const second = migrateV1ToDocument(asV1);
    expectDeepClose(second, first, "document");
  });
});

describe("adapter output is a modern v1 file", () => {
  it.each(ERA_FIXTURES)("%s passes validatePresetFileV1", (name) => {
    const asV1 = documentToV1(migrateFixture(name));
    const validated = validatePresetFileV1(asV1);
    expect(validated.kind).toBe("drumhaus.preset");
    expect(validated.version).toBe(1);
  });

  it.each(ERA_FIXTURES)("%s is a no-op through today's migrators", (name) => {
    const asV1 = documentToV1(migrateFixture(name));
    expect(migrateInstruments(asV1.kit.instruments)).toEqual(
      asV1.kit.instruments,
    );
    expect(migrateMasterChainParams(asV1.masterChain)).toEqual(
      asV1.masterChain,
    );
    expect(migratePattern(asV1.sequencer.pattern)).toEqual(
      asV1.sequencer.pattern,
    );
  });

  it("rehydrates registry kit data and inverts knob values (spot values)", () => {
    const asV1 = documentToV1(migrateFixture("v1-current.json"));

    // Registry data comes from kit-0, not from the source file.
    expect(asV1.kit.kind).toBe("drumhaus.kit");
    expect(asV1.kit.meta.id).toBe("kit-0");
    expect(asV1.kit.meta.name).toBe("808");
    expect(asV1.kit.instruments).toHaveLength(8);

    // The init preset's knob-space defaults, recovered from domain values.
    const params = asV1.kit.instruments[0].params;
    expect(params.decay).toBeCloseTo(100, 6); // 5s -> knob 100
    expect(params.filter).toBe(50);
    expect(params.volume).toBeCloseTo(92, 6); // 0 dB -> knob 92
    expect(params.pan).toBeCloseTo(50, 6);
    expect(params.tune).toBeCloseTo(50, 6); // 0 semitones -> center

    expect(asV1.transport.bpm).toBe(100);
    expect(asV1.transport.swing).toBe(0);
    expect(asV1.masterChain.compRatio).toBeCloseTo(400 / 7, 9); // ratio 5:1
    expect(asV1.masterChain.compThreshold).toBeCloseTo(100, 6); // 0 dB
    expect(asV1.masterChain.masterVolume).toBeCloseTo(92, 6);
    expect(asV1.sequencer.chain).toEqual({
      steps: [{ variation: 0, repeats: 1 }],
    });
    expect(asV1.sequencer.chainEnabled).toBe(false);
  });

  it("inverts a silent (null) volume to knob 0", () => {
    const document = migrateFixture("v1-current.json");
    const silent = {
      ...document,
      channels: [
        { ...document.channels[0], volumeDb: null },
        ...document.channels.slice(1),
      ],
      master: { ...document.master, masterVolumeDb: null },
    } as typeof document;
    const asV1 = documentToV1(silent);
    expect(asV1.kit.instruments[0].params.volume).toBe(0);
    expect(asV1.masterChain.masterVolume).toBe(0);
  });
});

describe("kit rehydration", () => {
  it("throws UnknownKitError for an unknown kit id", () => {
    const document = migrateFixture("v1-current.json");
    const orphaned = { ...document, kit: { id: "kit-404" } };
    try {
      documentToV1(orphaned);
      expect.unreachable("expected an UnknownKitError");
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownKitError);
      expect((error as UnknownKitError).code).toBe("unknown-kit");
      expect((error as UnknownKitError).kitId).toBe("kit-404");
    }
  });
});
