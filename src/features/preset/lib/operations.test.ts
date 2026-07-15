import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  encodePresetDocument,
  migrateV1ToDocument,
  parsePresetFileV1,
  UnsupportedVersionError,
  validatePresetFileV1,
} from "@/features/preset/document";
import { createPresetExportBlob, parsePresetFile } from "./operations";

function readFixture(name: string): string {
  return readFileSync(
    new URL(`../document/__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
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
 * Deep equality with a numeric tolerance (mirrors to-v1.test.ts): the
 * document -> v1 -> document trip crosses the inverse knob mappings, which
 * introduce float noise well under 1e-6; anything larger is a real loss.
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

describe("parsePresetFile on v1 files", () => {
  // Byte-identical legacy behavior: the dispatcher must return exactly what
  // the legacy parser returns, with no migration or normalization.
  it.each(ERA_FIXTURES)("%s matches parsePresetFileV1 exactly", (name) => {
    const text = readFixture(name);
    expect(parsePresetFile(text)).toEqual(parsePresetFileV1(text));
  });
});

describe("parsePresetFile on v2 files", () => {
  it.each(ERA_FIXTURES)(
    "%s (encoded as v2) adapts to a valid v1 that re-migrates losslessly",
    (name) => {
      const document = migrateV1ToDocument(
        parsePresetFileV1(readFixture(name)),
      );
      const asV1 = parsePresetFile(encodePresetDocument(document));

      const validated = validatePresetFileV1(asV1);
      expect(validated.kind).toBe("drumhaus.preset");
      expect(validated.version).toBe(1.5);

      expectDeepClose(migrateV1ToDocument(asV1), document, "document");
    },
  );

  it("refuses a version 3 file", () => {
    const raw = JSON.parse(readFixture("v1-current.json")) as Record<
      string,
      unknown
    >;
    raw.version = 3;
    expect(() => parsePresetFile(JSON.stringify(raw))).toThrow(
      UnsupportedVersionError,
    );
  });
});

describe("export-import loop", () => {
  // fixture -> import -> export (migrate + encode, exactly the .dh payload)
  // -> import -> re-migrate: the second migration equals the first.
  it.each(ERA_FIXTURES)("%s survives the full loop", (name) => {
    const imported = parsePresetFile(readFixture(name));
    const exportedText = encodePresetDocument(migrateV1ToDocument(imported));
    const reimported = parsePresetFile(exportedText);

    expectDeepClose(
      migrateV1ToDocument(reimported),
      migrateV1ToDocument(imported),
      "document",
    );
  });

  it("createPresetExportBlob writes the v2 document encoding", async () => {
    const preset = parsePresetFileV1(readFixture("v1-current.json"));
    const blob = createPresetExportBlob(preset);

    expect(blob.type).toBe("application/octet-stream");

    const text = await blob.text();
    expect(text).toBe(encodePresetDocument(migrateV1ToDocument(preset)));

    const raw = JSON.parse(text) as Record<string, unknown>;
    expect(raw.kind).toBe("drumhaus.preset");
    expect(raw.version).toBe(2);
  });
});
