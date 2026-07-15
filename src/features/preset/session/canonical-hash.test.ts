/**
 * Unit tests for the canonical preset-document hash.
 *
 * The two margins from the canonical-hash module comment are pinned here:
 * the rounding must absorb apply -> snapshot knob<->domain float noise
 * (hash-stable round trips for every era fixture), while never swallowing a
 * real edit (a 0.1 knob step on the flattest mapping in the app, master
 * compAttack at the bottom of its exponential curve, must change the hash).
 *
 * The engine module is mocked so the store-backed round-trip tests run in
 * the node project.
 */

import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { PresetDocument } from "@/features/preset/document";

const engineMock = vi.hoisted(() => ({
  play: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  stop: vi.fn(),
  setTempo: vi.fn(),
  setSwing: vi.fn(),
}));

vi.mock("@/core/audio/engine", () => ({
  getAudioEngine: () => engineMock,
}));

// Store-adjacent modules are imported dynamically in beforeAll, after the
// localStorage stub is in place for zustand's persist middleware.
let hashPresetDocument: typeof import("./canonical-hash").hashPresetDocument;
let applyPresetDocument: typeof import("@/features/preset/document/apply").applyPresetDocument;
let snapshotPresetDocument: typeof import("@/features/preset/document/snapshot").snapshotPresetDocument;
let migrateV1ToDocument: typeof import("@/features/preset/document").migrateV1ToDocument;
let parsePresetFileV1: typeof import("@/features/preset/document").parsePresetFileV1;
let useMasterChainStore: typeof import("@/features/master-bus/store/use-master-chain-store").useMasterChainStore;
let usePresetMetaStore: typeof import("@/features/preset/store/use-preset-meta-store").usePresetMetaStore;

function readFixture(name: string): string {
  return readFileSync(
    new URL(`../document/__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

function migrateFixture(name: string): PresetDocument {
  return migrateV1ToDocument(parsePresetFileV1(readFixture(name)));
}

function snapshotCurrent(): PresetDocument {
  const { currentPresetMeta, currentKitMeta } = usePresetMetaStore.getState();
  return snapshotPresetDocument(currentPresetMeta, currentKitMeta);
}

const ERA_FIXTURES = [
  "v1-current.json",
  "v1-legacy-params.json",
  "v1-legacy-master.json",
  "v1-legacy-cycle.json",
  "v1-legacy-pattern-array.json",
];

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });

  ({ hashPresetDocument } = await import("./canonical-hash"));
  ({ applyPresetDocument } = await import("@/features/preset/document/apply"));
  ({ snapshotPresetDocument } =
    await import("@/features/preset/document/snapshot"));
  ({ migrateV1ToDocument, parsePresetFileV1 } =
    await import("@/features/preset/document"));
  ({ useMasterChainStore } =
    await import("@/features/master-bus/store/use-master-chain-store"));
  ({ usePresetMetaStore } =
    await import("@/features/preset/store/use-preset-meta-store"));
});

describe("hashPresetDocument", () => {
  it.each(ERA_FIXTURES)(
    "%s is hash-stable across an apply -> snapshot round trip",
    (name) => {
      const document = migrateFixture(name);
      const preApplyHash = hashPresetDocument(document);

      applyPresetDocument(document);

      expect(hashPresetDocument(snapshotCurrent())).toBe(preApplyHash);
    },
  );

  it("is insensitive to meta.updatedAt (minted fresh on every snapshot)", () => {
    const document = migrateFixture("v1-current.json");
    const restamped: PresetDocument = {
      ...document,
      meta: { ...document.meta, updatedAt: "2099-01-01T00:00:00.000Z" },
    };

    expect(hashPresetDocument(restamped)).toBe(hashPresetDocument(document));
  });

  it("is sensitive to other meta fields (a rename is a real change)", () => {
    const document = migrateFixture("v1-current.json");
    const renamed: PresetDocument = {
      ...document,
      meta: { ...document.meta, name: "Renamed" },
    };

    expect(hashPresetDocument(renamed)).not.toBe(hashPresetDocument(document));
  });

  it("is insensitive to float noise below the canonical rounding", () => {
    const document = migrateFixture("v1-current.json");
    const noisy = structuredClone(document);
    noisy.channels[0].decaySeconds += 1e-12;
    noisy.transport.bpm += 1e-12;

    expect(hashPresetDocument(noisy)).toBe(hashPresetDocument(document));
  });

  it("is insensitive to object key construction order", () => {
    const document = migrateFixture("v1-current.json");
    const reordered = {
      ...document,
      transport: {
        swing: document.transport.swing,
        bpm: document.transport.bpm,
      },
    } as PresetDocument;

    expect(hashPresetDocument(reordered)).toBe(hashPresetDocument(document));
  });

  it("does not swallow the smallest real edit (0.1 knob of compAttack at the flat end)", () => {
    // Master compAttack has the smallest domain delta per knob step in the
    // app: exponential over 0.001..0.1 s, so a 0.1 knob step at the bottom
    // moves the domain value by (0.1/100)^2 * 0.099 s ~= 9.9e-8 s. That is
    // still two orders of magnitude above the 1e-9 canonical resolution.
    applyPresetDocument(migrateFixture("v1-current.json"));

    useMasterChainStore.getState().setCompAttack(0);
    const flat = snapshotCurrent();

    useMasterChainStore.getState().setCompAttack(0.1);
    const nudged = snapshotCurrent();

    const domainDelta =
      nudged.master.compAttackSeconds - flat.master.compAttackSeconds;
    expect(domainDelta).toBeGreaterThan(1e-9);
    expect(domainDelta).toBeLessThan(1e-5);

    expect(hashPresetDocument(nudged)).not.toBe(hashPresetDocument(flat));
  });
});
