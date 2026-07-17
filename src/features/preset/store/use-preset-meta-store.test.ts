/**
 * Store-level tests for the library mutations on usePresetMetaStore: the real
 * store drives the real per-preset library storage against an in-memory
 * localStorage, and every mutation must leave the storage entry, the index,
 * and the in-memory list coherent (docs/preset-persistence.md, PR 6).
 *
 * The engine is mocked so the suite runs in the node project; the store's
 * snapshot path reaches the musical stores but never a live AudioContext.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { init } from "@/core/dh";
import { loadKit } from "@/core/dhkit";
import {
  StorageFullError,
  type PresetDocument,
} from "@/features/preset/document";
import {
  hydrateLibrarySync,
  libraryEntryKey,
  readLibraryIndexSync,
} from "@/features/preset/library/library";
import { getItemSync } from "@/features/preset/library/storage";
import { usePresetMetaStore } from "./use-preset-meta-store";

vi.mock("@/core/audio/engine", () => ({
  getAudioEngine: () => ({
    play: vi.fn(() => Promise.resolve()),
    stop: vi.fn(),
    setTempo: vi.fn(),
    setSwing: vi.fn(),
  }),
}));

interface MemoryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  key: (index: number) => string | null;
  readonly length: number;
  map: Map<string, string>;
  failWrite: ((key: string) => boolean) | null;
}

function quotaError(): Error {
  const error = new Error("The quota has been exceeded.");
  error.name = "QuotaExceededError";
  return error;
}

function createMemoryStorage(): MemoryStorage {
  const map = new Map<string, string>();
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

function makeDocument(id: string, name: string): PresetDocument {
  const document = init();
  return { ...document, meta: { ...document.meta, id, name } };
}

/** Flush the fire-and-forget index write scheduled by addCustomPreset. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  usePresetMetaStore.setState({
    customPresets: [],
    currentPresetMeta: init().meta,
    currentKitMeta: loadKit(init().kit.id)!.meta,
    cleanHash: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Assert that memory, the entry, and the index agree for a document id. */
function expectCoherent(id: string, name: string): void {
  const store = usePresetMetaStore.getState();
  const inMemory = store.customPresets.find((d) => d.meta.id === id);
  expect(inMemory?.meta.name).toBe(name);

  const entry = getItemSync(libraryEntryKey(id));
  expect(entry).not.toBeNull();

  const indexRow = readLibraryIndexSync().find((r) => r.id === id);
  expect(indexRow?.name).toBe(name);

  const hydrated = hydrateLibrarySync().find((d) => d.meta.id === id);
  expect(hydrated?.meta.name).toBe(name);
}

describe("saveCurrentAsNewPreset", () => {
  it("writes entry + index + memory coherently", async () => {
    const saved = await usePresetMetaStore
      .getState()
      .saveCurrentAsNewPreset("My Beat");

    expect(saved).not.toBeNull();
    expect(saved!.meta.name).toBe("My Beat");
    expectCoherent(saved!.meta.id, "My Beat");
    // Newest first.
    expect(usePresetMetaStore.getState().customPresets[0].meta.id).toBe(
      saved!.meta.id,
    );
  });

  it("returns null at the preset limit without writing", async () => {
    const full = Array.from({ length: 100 }, (_, i) =>
      makeDocument(`preset-${i}`, `Preset ${i}`),
    );
    usePresetMetaStore.getState().hydrateLibrary(full);

    const saved = await usePresetMetaStore
      .getState()
      .saveCurrentAsNewPreset("Overflow");

    expect(saved).toBeNull();
    expect(usePresetMetaStore.getState().customPresets).toHaveLength(100);
  });

  it("surfaces StorageFullError and does not touch memory", async () => {
    storage.failWrite = () => true;

    await expect(
      usePresetMetaStore.getState().saveCurrentAsNewPreset("Nope"),
    ).rejects.toBeInstanceOf(StorageFullError);

    expect(usePresetMetaStore.getState().customPresets).toHaveLength(0);
  });
});

describe("updateCustomPreset", () => {
  it("rewrites the entry under the same id", async () => {
    const saved = await usePresetMetaStore
      .getState()
      .saveCurrentAsNewPreset("Original");
    const id = saved!.meta.id;

    // Edit the live transport so the snapshot differs, then update.
    usePresetMetaStore.setState((state) => ({
      currentPresetMeta: { ...state.currentPresetMeta },
    }));
    await usePresetMetaStore.getState().updateCustomPreset(id);

    expect(usePresetMetaStore.getState().customPresets).toHaveLength(1);
    expectCoherent(id, "Original");
  });

  it("does nothing for an unknown id", async () => {
    await usePresetMetaStore.getState().updateCustomPreset("ghost");
    expect(usePresetMetaStore.getState().customPresets).toHaveLength(0);
  });
});

describe("renameCustomPreset", () => {
  it("rewrites the entry meta and the index row", async () => {
    const saved = await usePresetMetaStore
      .getState()
      .saveCurrentAsNewPreset("Before");
    const id = saved!.meta.id;

    await usePresetMetaStore.getState().renameCustomPreset(id, "After");

    expectCoherent(id, "After");
  });
});

describe("duplicateCustomPreset", () => {
  it("creates a distinct entry copied from the source", async () => {
    const saved = await usePresetMetaStore
      .getState()
      .saveCurrentAsNewPreset("Source");
    const sourceId = saved!.meta.id;

    const dupe = await usePresetMetaStore
      .getState()
      .duplicateCustomPreset(sourceId);

    expect(dupe.meta.id).not.toBe(sourceId);
    expect(usePresetMetaStore.getState().customPresets).toHaveLength(2);
    // Newest (the duplicate) is unshifted to the front.
    expect(usePresetMetaStore.getState().customPresets[0].meta.id).toBe(
      dupe.meta.id,
    );
    expectCoherent(dupe.meta.id, dupe.meta.name);
    expectCoherent(sourceId, "Source");
  });

  it("rejects for an unknown id", async () => {
    await expect(
      usePresetMetaStore.getState().duplicateCustomPreset("ghost"),
    ).rejects.toThrow();
  });
});

describe("deleteCustomPreset", () => {
  it("removes entry, index row, and memory together", async () => {
    const saved = await usePresetMetaStore
      .getState()
      .saveCurrentAsNewPreset("Doomed");
    const id = saved!.meta.id;

    await usePresetMetaStore.getState().deleteCustomPreset(id);

    expect(usePresetMetaStore.getState().customPresets).toHaveLength(0);
    expect(getItemSync(libraryEntryKey(id))).toBeNull();
    expect(readLibraryIndexSync().find((r) => r.id === id)).toBeUndefined();
  });
});

describe("addCustomPreset (import path)", () => {
  it("dedupes by id and unshifts the newest to the front", async () => {
    const first = makeDocument("import-1", "First");
    const second = makeDocument("import-2", "Second");

    usePresetMetaStore.getState().addCustomPreset(first);
    usePresetMetaStore.getState().addCustomPreset(second);
    // A duplicate id is ignored.
    usePresetMetaStore
      .getState()
      .addCustomPreset(makeDocument("import-1", "Dup"));

    const ids = usePresetMetaStore
      .getState()
      .customPresets.map((d) => d.meta.id);
    expect(ids).toEqual(["import-2", "import-1"]);

    // The best-effort entry + index writes eventually land.
    await flushMicrotasks();
    expectCoherent("import-1", "First");
    expectCoherent("import-2", "Second");
  });
});
