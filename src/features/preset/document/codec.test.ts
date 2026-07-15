import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { decodePresetFileText } from "./decode";
import { encodePresetDocument } from "./encode";
import {
  CorruptFieldError,
  InvalidFileError,
  UnsupportedVersionError,
} from "./errors";
import { migrateV1ToDocument } from "./migrate-v1";
import { parsePresetFileV1 } from "./parse";

function readFixture(name: string): string {
  return readFileSync(
    new URL(`./__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

function migrateFixture(name: string) {
  return migrateV1ToDocument(parsePresetFileV1(readFixture(name)));
}

/** A mutable v2 document, as raw JSON, built from the modern fixture. */
function rawV2Document(): Record<string, unknown> {
  return JSON.parse(
    encodePresetDocument(migrateFixture("v1-current.json")),
  ) as Record<string, unknown>;
}

const ERA_FIXTURES = [
  "v1-current.json",
  "v1-legacy-params.json",
  "v1-legacy-master.json",
  "v1-legacy-cycle.json",
  "v1-legacy-pattern-array.json",
];

describe("encode/decode round trip", () => {
  // The round-trip guarantee: decode(encode(doc)) is identity for every
  // era's migrated document.
  it.each(ERA_FIXTURES)("%s round-trips through the codec", (name) => {
    const document = migrateFixture(name);
    expect(decodePresetFileText(encodePresetDocument(document))).toEqual(
      document,
    );
  });

  it.each(ERA_FIXTURES)("%s encodes with the v2 envelope", (name) => {
    const text = encodePresetDocument(migrateFixture(name));
    const raw = JSON.parse(text) as Record<string, unknown>;
    expect(raw.kind).toBe("drumhaus.preset");
    expect(raw.version).toBe(2);
  });

  it("pretty-prints with 2-space indentation", () => {
    const text = encodePresetDocument(migrateFixture("v1-current.json"));
    expect(text.startsWith('{\n  "kind": "drumhaus.preset",')).toBe(true);
  });
});

describe("dual-read", () => {
  it.each(ERA_FIXTURES)(
    "%s (v1 text) decodes to its migrated document",
    (name) => {
      expect(decodePresetFileText(readFixture(name))).toEqual(
        migrateFixture(name),
      );
    },
  );
});

describe("decode failure taxonomy", () => {
  it("refuses a version 3 document", () => {
    const raw = rawV2Document();
    raw.version = 3;
    try {
      decodePresetFileText(JSON.stringify(raw));
      expect.unreachable("expected an UnsupportedVersionError");
    } catch (error) {
      expect(error).toBeInstanceOf(UnsupportedVersionError);
      expect((error as UnsupportedVersionError).version).toBe(3);
    }
  });

  it("flags a v2 range violation with the field's dot path", () => {
    const raw = rawV2Document();
    (raw.transport as { swing: number }).swing = 0.7;
    try {
      decodePresetFileText(JSON.stringify(raw));
      expect.unreachable("expected a CorruptFieldError");
    } catch (error) {
      expect(error).toBeInstanceOf(CorruptFieldError);
      expect((error as CorruptFieldError).path).toBe("transport.swing");
    }
  });

  it("refuses non-JSON text", () => {
    expect(() => decodePresetFileText("{not json")).toThrow(InvalidFileError);
  });

  it("refuses a non-object", () => {
    expect(() => decodePresetFileText('"a string"')).toThrow(InvalidFileError);
  });

  it("refuses the wrong kind", () => {
    expect(() => decodePresetFileText(readFixture("wrong-kind.json"))).toThrow(
      InvalidFileError,
    );
  });
});
