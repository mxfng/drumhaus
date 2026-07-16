/**
 * Unit tests for the per-preset library storage (docs/preset-persistence.md,
 * "Library storage: documents under per-preset keys", decision 14): CRUD
 * round-trips through the document schema, index self-heal against the
 * entries, per-entry quarantine of corrupt payloads, and the typed
 * StorageFullError on a quota-refused write.
 *
 * The library sync/async functions read globalThis.localStorage at call time,
 * so an in-memory stub installed per test is enough; no module reset is
 * needed. The stub carries length/key() because listKeysSync scans them.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { init } from "@/core/dh";
import {
  StorageFullError,
  UnsupportedVersionError,
  type PresetDocument,
} from "@/features/preset/document";
import { frozenSplitFilterPositionToCanonical } from "@/features/preset/document/frozen-split-filter";
import {
  decodeLibraryEntry,
  hydrateLibrarySync,
  LIBRARY_INDEX_KEY,
  libraryEntryKey,
  libraryQuarantineKey,
  putLibraryEntry,
  putLibraryEntrySync,
  readLibraryIndexSync,
  removeLibraryEntry,
  writeLibraryIndex,
  writeLibraryIndexSync,
  type LibraryIndexRow,
} from "./library";
import { getItemSync } from "./storage";

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

function makeDocument(id: string, name: string): PresetDocument {
  const document = init();
  return { ...document, meta: { ...document.meta, id, name } };
}

/** Distinct v2 filter positions per channel, mirroring migrate-v2.test.ts. */
const V2_CHANNEL_FILTER_POSITIONS = [0, 20, 49, 50, 51, 80, 100, 35];
const V2_MASTER_FILTER_POSITION = 65;

/**
 * A version-2 document (the first domain document, whose split filter was
 * still a 0-100 position), built by downgrading a current document to the v2
 * shape. Mirrors migrate-v2.test.ts's buildV2Document helper.
 */
function buildV2Document(id: string, name: string): Record<string, unknown> {
  const v21 = makeDocument(id, name);
  const channels = v21.channels.map((channel, index) => ({
    ...channel,
    filter: V2_CHANNEL_FILTER_POSITIONS[index],
  }));
  return {
    ...v21,
    version: 2,
    channels,
    master: { ...v21.master, filter: V2_MASTER_FILTER_POSITION },
  };
}

/** The index rows implied by a set of documents, in the given order. */
function rowsFor(...documents: PresetDocument[]): LibraryIndexRow[] {
  return documents.map((document) => ({
    id: document.meta.id,
    name: document.meta.name,
  }));
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

describe("library CRUD", () => {
  it("round-trips a document through put -> list -> get -> remove", async () => {
    const document = makeDocument("preset-a", "Alpha");

    await putLibraryEntry(document);
    await writeLibraryIndex(rowsFor(document));

    // list (hydrate reads every entry through the schema).
    const listed = hydrateLibrarySync();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(document);

    // get (one entry decoded through the standard schema).
    const raw = getItemSync(libraryEntryKey("preset-a"));
    expect(raw).not.toBeNull();
    const decoded = decodeLibraryEntry(raw!);
    expect(decoded.status).toBe("ok");
    if (decoded.status === "ok") expect(decoded.document).toEqual(document);

    // remove.
    await removeLibraryEntry("preset-a");
    expect(getItemSync(libraryEntryKey("preset-a"))).toBeNull();
    await writeLibraryIndex([]);
    expect(hydrateLibrarySync()).toEqual([]);
  });

  it("keeps multiple entries in index order", () => {
    const first = makeDocument("preset-1", "One");
    const second = makeDocument("preset-2", "Two");
    putLibraryEntrySync(first);
    putLibraryEntrySync(second);
    writeLibraryIndexSync(rowsFor(second, first));

    const listed = hydrateLibrarySync();
    expect(listed.map((d) => d.meta.id)).toEqual(["preset-2", "preset-1"]);
  });
});

describe("index self-heal on hydrate", () => {
  it("drops an index row whose entry is missing", () => {
    const present = makeDocument("present", "Present");
    putLibraryEntrySync(present);
    // The index also names an entry that was never written.
    writeLibraryIndexSync([
      { id: "present", name: "Present" },
      { id: "ghost", name: "Ghost" },
    ]);

    const listed = hydrateLibrarySync();
    expect(listed.map((d) => d.meta.id)).toEqual(["present"]);
    // The index was rewritten without the ghost row.
    expect(readLibraryIndexSync()).toEqual([
      { id: "present", name: "Present" },
    ]);
  });

  it("appends an orphan entry that the index does not know about", () => {
    const known = makeDocument("known", "Known");
    const orphan = makeDocument("orphan", "Orphan");
    putLibraryEntrySync(known);
    putLibraryEntrySync(orphan);
    // The index only knows the first one.
    writeLibraryIndexSync(rowsFor(known));

    const listed = hydrateLibrarySync();
    expect(listed.map((d) => d.meta.id).sort()).toEqual(["known", "orphan"]);
    // The healed index now carries both, orphan appended after the known row.
    expect(readLibraryIndexSync().map((r) => r.id)).toEqual([
      "known",
      "orphan",
    ]);
  });

  it("heals a stale name in the index from the entry meta (truth)", () => {
    const document = makeDocument("preset", "Real Name");
    putLibraryEntrySync(document);
    writeLibraryIndexSync([{ id: "preset", name: "Stale Name" }]);

    hydrateLibrarySync();
    expect(readLibraryIndexSync()).toEqual([
      { id: "preset", name: "Real Name" },
    ]);
  });
});

describe("corrupt-entry quarantine", () => {
  it("quarantines a corrupt entry and hydrates the others", () => {
    const good = makeDocument("good", "Good");
    putLibraryEntrySync(good);
    // A syntactically-broken entry directly in storage under the entry prefix.
    storage.map.set(libraryEntryKey("bad"), "{ not json");
    writeLibraryIndexSync([
      { id: "good", name: "Good" },
      { id: "bad", name: "Bad" },
    ]);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const listed = hydrateLibrarySync();

    // The good entry survives; the bad one is gone from the live set.
    expect(listed.map((d) => d.meta.id)).toEqual(["good"]);
    // Copied verbatim to its quarantine key, removed from the live key.
    expect(storage.map.get(libraryQuarantineKey("bad"))).toBe("{ not json");
    expect(storage.map.has(libraryEntryKey("bad"))).toBe(false);
    // Dropped from the index.
    expect(readLibraryIndexSync().map((r) => r.id)).toEqual(["good"]);
    expect(consoleError).toHaveBeenCalled();
  });

  it("quarantines a schema-invalid (well-formed JSON) entry", () => {
    storage.map.set(
      libraryEntryKey("wrong"),
      JSON.stringify({ kind: "drumhaus.preset", version: 2, nope: true }),
    );
    writeLibraryIndexSync([{ id: "wrong", name: "Wrong" }]);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(hydrateLibrarySync()).toEqual([]);
    expect(storage.map.has(libraryQuarantineKey("wrong"))).toBe(true);
    expect(storage.map.has(libraryEntryKey("wrong"))).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

  it("still reports a genuinely unreadable entry as a typed corrupt error", () => {
    // An entry version outside the readable range is refused by the ladder;
    // decodeLibraryEntry surfaces the typed error so hydrate quarantines it.
    const result = decodeLibraryEntry(
      JSON.stringify({ kind: "drumhaus.preset", version: 99 }),
    );

    expect(result.status).toBe("corrupt");
    if (result.status === "corrupt") {
      expect(result.error).toBeInstanceOf(UnsupportedVersionError);
    }
  });
});

describe("v2 entry migration on hydrate", () => {
  it("hydrates and migrates a library entry holding a v2 document", () => {
    // A drumhaus-preset-<id> entry written by the v2-era build embeds a
    // version-2 document (split filter as a 0-100 position). It must migrate
    // through decodePresetObject on hydrate, not read as corrupt (issue #382).
    const v2Document = buildV2Document("v2-preset", "V2 Preset");
    storage.map.set(libraryEntryKey("v2-preset"), JSON.stringify(v2Document));
    writeLibraryIndexSync([{ id: "v2-preset", name: "V2 Preset" }]);

    const listed = hydrateLibrarySync();

    // Migrated to the current version, not quarantined.
    expect(listed).toHaveLength(1);
    expect(listed[0].version).toBe(2.1);
    expect(listed[0].meta.id).toBe("v2-preset");
    expect(listed[0].master.filter).toEqual(
      frozenSplitFilterPositionToCanonical(V2_MASTER_FILTER_POSITION),
    );
    expect(storage.map.has(libraryQuarantineKey("v2-preset"))).toBe(false);
    expect(storage.map.has(libraryEntryKey("v2-preset"))).toBe(true);
  });
});

describe("StorageFullError on quota", () => {
  it("putLibraryEntrySync throws StorageFullError on a quota-refused write", () => {
    const document = makeDocument("preset", "Preset");
    storage.failWrite = (key) => key === libraryEntryKey("preset");

    expect(() => putLibraryEntrySync(document)).toThrow(StorageFullError);
  });

  it("putLibraryEntry (async) rejects with StorageFullError on quota", async () => {
    const document = makeDocument("preset", "Preset");
    storage.failWrite = () => true;

    await expect(putLibraryEntry(document)).rejects.toBeInstanceOf(
      StorageFullError,
    );
  });

  it("writeLibraryIndex rejects with StorageFullError on quota", async () => {
    storage.failWrite = (key) => key === LIBRARY_INDEX_KEY;
    await expect(writeLibraryIndex([])).rejects.toBeInstanceOf(
      StorageFullError,
    );
  });
});
