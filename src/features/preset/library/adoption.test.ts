/**
 * Unit tests for the one-time legacy library adoption
 * (docs/preset-persistence.md, PR 6, decision 9): the retired
 * drumhaus-preset-meta-storage array of PresetFileV1 objects migrates into
 * per-preset document entries, with a verbatim pre-adoption backup, per-entry
 * quarantine, delete-only-after-write ordering, and idempotent resume.
 *
 * The adoption reads globalThis.localStorage at call time, so an in-memory
 * stub installed per test is enough. Adoption's imports are pure (schema,
 * migrators, constants), so the node project runs this without an engine
 * mock.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { init } from "@/core/dh";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { adoptLegacyPresetLibrary, LIBRARY_BACKUP_KEY } from "./adoption";
import {
  hydrateLibrarySync,
  libraryEntryKey,
  libraryQuarantineKey,
  readLibraryIndexSync,
} from "./library";

const LEGACY_KEY = "drumhaus-preset-meta-storage";

interface MemoryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  key: (index: number) => string | null;
  readonly length: number;
  map: Map<string, string>;
  /** When set, a setItem whose key matches throws QuotaExceededError. */
  failWrite: ((key: string) => boolean) | null;
}

function quotaError(): Error {
  const error = new Error("The quota has been exceeded.");
  error.name = "QuotaExceededError";
  return error;
}

function createMemoryStorage(seed: Record<string, string> = {}): MemoryStorage {
  const map = new Map(Object.entries(seed));
  const storage: MemoryStorage = {
    map,
    failWrite: null,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      if (storage.failWrite?.(key)) throw quotaError();
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  return storage;
}

/** A full, valid v1 preset (embedded kit and all) under a custom identity. */
function legacyPreset(id: string, name: string): PresetFileV1 {
  const preset = init();
  return { ...preset, meta: { ...preset.meta, id, name } };
}

/** The legacy preset-meta envelope shape (persist version 1). */
function legacyEnvelope(customPresets: unknown[]): string {
  const preset = init();
  return JSON.stringify({
    state: {
      currentPresetMeta: preset.meta,
      currentKitMeta: preset.kit.meta,
      customPresets,
    },
    version: 1,
  });
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("happy path", () => {
  it("adopts two presets into entries, backs up the raw payload, deletes the legacy key", () => {
    const first = legacyPreset("preset-1", "First");
    const second = legacyPreset("preset-2", "Second");
    const raw = legacyEnvelope([first, second]);
    storage.map.set(LEGACY_KEY, raw);

    adoptLegacyPresetLibrary();

    // Two entries, index in the legacy array's order.
    expect(readLibraryIndexSync().map((r) => r.id)).toEqual([
      "preset-1",
      "preset-2",
    ]);
    const listed = hydrateLibrarySync();
    expect(listed.map((d) => d.meta.id)).toEqual(["preset-1", "preset-2"]);
    expect(listed.map((d) => d.meta.name)).toEqual(["First", "Second"]);

    // The raw legacy payload is preserved verbatim under the backup key.
    expect(storage.map.get(LIBRARY_BACKUP_KEY)).toBe(raw);

    // The legacy key is gone (deleted only after every entry landed).
    expect(storage.map.has(LEGACY_KEY)).toBe(false);
  });
});

describe("corrupt entry", () => {
  it("quarantines the invalid preset while the valid one adopts", () => {
    const valid = legacyPreset("valid", "Valid");
    // A v1 envelope that passes the kind/version gate but fails the schema.
    const corrupt = {
      kind: "drumhaus.preset",
      version: 1,
      meta: { id: "corrupt", name: "Corrupt" },
    };
    storage.map.set(LEGACY_KEY, legacyEnvelope([valid, corrupt]));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    adoptLegacyPresetLibrary();

    // The valid one adopted.
    expect(hydrateLibrarySync().map((d) => d.meta.id)).toEqual(["valid"]);
    // The corrupt one quarantined verbatim, never an entry.
    expect(storage.map.get(libraryQuarantineKey("corrupt"))).toBe(
      JSON.stringify(corrupt),
    );
    expect(storage.map.has(libraryEntryKey("corrupt"))).toBe(false);
    // Adoption still completes: the legacy key retires.
    expect(storage.map.has(LEGACY_KEY)).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("storage-full mid-adoption", () => {
  it("stops with the legacy key and backup intact, and resumes idempotently", () => {
    const first = legacyPreset("preset-1", "First");
    const second = legacyPreset("preset-2", "Second");
    const raw = legacyEnvelope([first, second]);
    storage.map.set(LEGACY_KEY, raw);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // The second entry's write hits quota; the first lands.
    storage.failWrite = (key) => key === libraryEntryKey("preset-2");
    adoptLegacyPresetLibrary();

    // First entry written, second not; legacy key and backup preserved.
    expect(storage.map.has(libraryEntryKey("preset-1"))).toBe(true);
    expect(storage.map.has(libraryEntryKey("preset-2"))).toBe(false);
    expect(storage.map.get(LEGACY_KEY)).toBe(raw);
    expect(storage.map.get(LIBRARY_BACKUP_KEY)).toBe(raw);
    expect(consoleError).toHaveBeenCalled();

    // Next boot: quota clears, adoption resumes without duplicating preset-1.
    storage.failWrite = null;
    adoptLegacyPresetLibrary();

    expect(readLibraryIndexSync().map((r) => r.id)).toEqual([
      "preset-1",
      "preset-2",
    ]);
    expect(hydrateLibrarySync().map((d) => d.meta.id)).toEqual([
      "preset-1",
      "preset-2",
    ]);
    expect(storage.map.has(LEGACY_KEY)).toBe(false);
  });
});

describe("no-op re-runs", () => {
  it("returns immediately when no legacy key is present", () => {
    adoptLegacyPresetLibrary();
    expect(storage.map.size).toBe(0);
  });

  it("does not run again after a completed adoption", () => {
    storage.map.set(LEGACY_KEY, legacyEnvelope([legacyPreset("p", "P")]));
    adoptLegacyPresetLibrary();
    expect(storage.map.has(LEGACY_KEY)).toBe(false);

    const before = new Map(storage.map);
    adoptLegacyPresetLibrary();
    // Nothing changed: the legacy key is gone, so adoption is inert.
    expect(storage.map).toEqual(before);
  });
});
