/**
 * The preset library: each saved preset is its own storage entry holding the
 * MINIFIED preset document, plus a small index key for ordering
 * (docs/preset-persistence.md, "Library storage: documents under per-preset
 * keys", decision 14). The design doc writes the entry keys with dots
 * (`drumhaus.preset.<id>`); this module follows the repo's established dash
 * convention (`drumhaus-session`, `drumhaus-session-ui`) instead.
 *
 * The index is a cache and entry meta is truth: boot self-heals by dropping
 * index rows whose entry is missing and appending entries the index does not
 * know about. A corrupt entry is quarantined (copied to its quarantine key,
 * then removed from live, never destroyed) and dropped from the index with a
 * console.error.
 *
 * Two access levels, mirroring storage.ts: the async CRUD functions the
 * store mutations use (through the LibraryStorage facade), and the sync
 * hydrate for bootstrapLibrary(), which must fill the in-memory library
 * before React's first paint.
 */

import {
  decodePresetObject,
  InvalidFileError,
  PresetDocumentError,
  presetDocumentSchema,
  type PresetDocument,
} from "@/features/preset/document";
import {
  getItemSync,
  libraryStorage,
  listKeysSync,
  putItemSync,
  removeItemSync,
} from "./storage";

const LIBRARY_ENTRY_KEY_PREFIX = "drumhaus-preset-";
const LIBRARY_INDEX_KEY = "drumhaus-preset-index";
const LIBRARY_QUARANTINE_KEY_PREFIX = "drumhaus-preset-quarantine-";

/** One ordered index row; everything list-shaped in the UI reads these. */
interface LibraryIndexRow {
  id: string;
  name: string;
}

function libraryEntryKey(id: string): string {
  return `${LIBRARY_ENTRY_KEY_PREFIX}${id}`;
}

function libraryQuarantineKey(id: string): string {
  return `${LIBRARY_QUARANTINE_KEY_PREFIX}${id}`;
}

/**
 * The index and quarantine keys live under the entry prefix (their spelling
 * is fixed by the design doc), so both entry scans and entry writes must
 * exclude them. An id that would collide is refused at write time.
 */
function isReservedLibraryId(id: string): boolean {
  const key = libraryEntryKey(id);
  return (
    key === LIBRARY_INDEX_KEY || key.startsWith(LIBRARY_QUARANTINE_KEY_PREFIX)
  );
}

function isLibraryEntryKey(key: string): boolean {
  return (
    key.startsWith(LIBRARY_ENTRY_KEY_PREFIX) &&
    key !== LIBRARY_INDEX_KEY &&
    !key.startsWith(LIBRARY_QUARANTINE_KEY_PREFIX)
  );
}

/**
 * Serialize a document for an entry: the storage encoding is minified JSON
 * of the schema-parsed document, so an out-of-range value fails loudly at
 * write time (same posture as encodePresetDocument) and key order is
 * deterministic.
 */
function encodeLibraryEntry(document: PresetDocument): string {
  return JSON.stringify(presetDocumentSchema.parse(document));
}

type LibraryEntryDecodeResult =
  | { status: "ok"; document: PresetDocument }
  | { status: "corrupt"; error: PresetDocumentError };

/**
 * Decode one entry payload through the version-dispatching ladder
 * (decodePresetObject), so a v2-era (or any future readable) entry migrates to
 * the current document rather than reading as corrupt. A genuinely bad payload
 * surfaces as a typed error for quarantine (never destroyed).
 */
function decodeLibraryEntry(raw: string): LibraryEntryDecodeResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      status: "corrupt",
      error: new InvalidFileError("Library entry is not valid JSON"),
    };
  }

  try {
    return { status: "ok", document: decodePresetObject(data) };
  } catch (error) {
    if (error instanceof PresetDocumentError) {
      return { status: "corrupt", error };
    }
    throw error;
  }
}

// --- Sync internals (boot + adoption) ----------------------------------------

/**
 * Read the index rows. The index is a cache, so an unreadable or misshapen
 * index degrades to empty and the entry scan in hydrateLibrarySync rebuilds
 * it; no data is at risk.
 */
function readLibraryIndexSync(): LibraryIndexRow[] {
  const raw = getItemSync(LIBRARY_INDEX_KEY);
  if (raw === null) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  return data.filter(
    (row): row is LibraryIndexRow =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as { id?: unknown }).id === "string" &&
      typeof (row as { name?: unknown }).name === "string",
  );
}

/**
 * Write the index rows.
 *
 * @throws {StorageFullError} If the browser refused the write for quota
 */
function writeLibraryIndexSync(rows: LibraryIndexRow[]): void {
  putItemSync(LIBRARY_INDEX_KEY, JSON.stringify(rows));
}

/**
 * Write one entry.
 *
 * @throws {StorageFullError} If the browser refused the write for quota
 * @throws {z.ZodError} If the document violates presetDocumentSchema
 */
function putLibraryEntrySync(document: PresetDocument): void {
  if (isReservedLibraryId(document.meta.id)) {
    throw new Error(
      `Preset id "${document.meta.id}" collides with a reserved library key`,
    );
  }
  putItemSync(libraryEntryKey(document.meta.id), encodeLibraryEntry(document));
}

/**
 * Move a corrupt entry payload to its quarantine key: copy first, remove
 * from live only after the copy landed, never destroy. Best-effort - a
 * failed quarantine write leaves the corrupt entry in place, and the next
 * boot tries again.
 */
function quarantineLibraryEntrySync(id: string, raw: string): void {
  try {
    putItemSync(libraryQuarantineKey(id), raw);
    removeItemSync(libraryEntryKey(id));
  } catch (error) {
    console.error(
      `Drumhaus library: failed to quarantine corrupt entry "${id}"; ` +
        "leaving it in place",
      error,
    );
  }
}

/**
 * Hydrate the library from storage, self-healing the index against the
 * entries (entry meta is truth):
 *
 * - index rows whose entry is missing are dropped,
 * - entries the index does not know are appended in scan order,
 * - corrupt entries are quarantined and dropped, with a console.error.
 *
 * Returns the documents in final index order. The index is rewritten only
 * when healing changed it (best-effort: an unwritable index just self-heals
 * again next boot).
 */
function hydrateLibrarySync(): PresetDocument[] {
  const indexRows = readLibraryIndexSync();
  const documents: PresetDocument[] = [];
  const healedRows: LibraryIndexRow[] = [];
  const seen = new Set<string>();
  let changed = false;

  const readEntry = (id: string): PresetDocument | null => {
    const raw = getItemSync(libraryEntryKey(id));
    if (raw === null) return null;
    const decoded = decodeLibraryEntry(raw);
    if (decoded.status === "corrupt") {
      console.error(
        `Drumhaus library: entry "${id}" is corrupt; quarantining it`,
        decoded.error,
      );
      quarantineLibraryEntrySync(id, raw);
      return null;
    }
    return decoded.document;
  };

  for (const row of indexRows) {
    if (seen.has(row.id)) {
      changed = true;
      continue;
    }
    seen.add(row.id);

    const document = readEntry(row.id);
    if (document === null) {
      changed = true;
      continue;
    }

    documents.push(document);
    healedRows.push({ id: document.meta.id, name: document.meta.name });
    if (document.meta.name !== row.name) changed = true;
  }

  // Entries the index does not know about (e.g. an interrupted write whose
  // entry landed but whose index update did not) are appended.
  for (const key of listKeysSync(LIBRARY_ENTRY_KEY_PREFIX)) {
    if (!isLibraryEntryKey(key)) continue;
    const id = key.slice(LIBRARY_ENTRY_KEY_PREFIX.length);
    if (seen.has(id)) continue;
    seen.add(id);

    const document = readEntry(id);
    if (document === null) {
      changed = true;
      continue;
    }

    documents.push(document);
    healedRows.push({ id: document.meta.id, name: document.meta.name });
    changed = true;
  }

  if (changed) {
    try {
      writeLibraryIndexSync(healedRows);
    } catch (error) {
      console.error("Drumhaus library: failed to rewrite the index", error);
    }
  }

  return documents;
}

// --- Async CRUD (store mutations) ---------------------------------------------

/**
 * Write one entry through the async facade.
 *
 * @throws {StorageFullError} If the browser refused the write for quota
 */
async function putLibraryEntry(document: PresetDocument): Promise<void> {
  if (isReservedLibraryId(document.meta.id)) {
    throw new Error(
      `Preset id "${document.meta.id}" collides with a reserved library key`,
    );
  }
  await libraryStorage.put(
    libraryEntryKey(document.meta.id),
    encodeLibraryEntry(document),
  );
}

async function removeLibraryEntry(id: string): Promise<void> {
  await libraryStorage.remove(libraryEntryKey(id));
}

/**
 * Write the index rows through the async facade.
 *
 * @throws {StorageFullError} If the browser refused the write for quota
 */
async function writeLibraryIndex(rows: LibraryIndexRow[]): Promise<void> {
  await libraryStorage.put(LIBRARY_INDEX_KEY, JSON.stringify(rows));
}

export {
  LIBRARY_ENTRY_KEY_PREFIX,
  LIBRARY_INDEX_KEY,
  LIBRARY_QUARANTINE_KEY_PREFIX,
  decodeLibraryEntry,
  hydrateLibrarySync,
  isReservedLibraryId,
  libraryEntryKey,
  libraryQuarantineKey,
  putLibraryEntry,
  putLibraryEntrySync,
  quarantineLibraryEntrySync,
  readLibraryIndexSync,
  removeLibraryEntry,
  writeLibraryIndex,
  writeLibraryIndexSync,
};
export type { LibraryIndexRow };
