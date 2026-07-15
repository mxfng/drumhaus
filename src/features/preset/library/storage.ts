/**
 * The library's storage backend (docs/preset-persistence.md, "Library
 * storage: documents under per-preset keys", decision 14): a thin ASYNC
 * key-value interface so IndexedDB can slot in behind the same contract if
 * sample blobs ever ship, over the localStorage backend that is the right
 * choice today (entries are a few KB after kit-by-reference).
 *
 * The sync functions are the backend's internals, exported for the two
 * callers that legitimately need synchronous storage: bootstrapLibrary()
 * (the in-memory library must be populated before React's first paint, so a
 * saved preset is in the select immediately after reload) and the one-time
 * legacy adoption that runs inside it. Everything after boot goes through
 * the async facade.
 *
 * Access is guarded like session-storage.ts: private-browsing/storage-denied
 * modes degrade reads to "nothing stored" and removals to no-ops rather
 * than break boot. Writes are the exception: a failed write must surface to
 * the caller (a save the user asked for did not land), so quota failures
 * throw the typed StorageFullError and anything else propagates as-is.
 */

import { StorageFullError } from "@/features/preset/document";

/** Quota failures across engines; everything modern uses the first name. */
function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/** Read one key; storage denial reads as missing. */
function getItemSync(key: string): string | null {
  try {
    return globalThis.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write one key.
 *
 * @throws {StorageFullError} If the browser refused the write for quota
 * @throws {Error} As thrown by the storage layer for any other failure
 * (e.g. storage denied entirely)
 */
function putItemSync(key: string, value: string): void {
  try {
    globalThis.localStorage.setItem(key, value);
  } catch (error) {
    if (isQuotaExceededError(error)) throw new StorageFullError();
    throw error;
  }
}

/** Remove one key; storage denial is a no-op (there is nothing to remove). */
function removeItemSync(key: string): void {
  try {
    globalThis.localStorage.removeItem(key);
  } catch {
    // Nothing readable means nothing removable.
  }
}

/** All stored keys starting with `prefix`; storage denial reads as none. */
function listKeysSync(prefix: string): string[] {
  const keys: string[] = [];
  try {
    const storage = globalThis.localStorage;
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key !== null && key.startsWith(prefix)) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys;
}

/**
 * The async storage interface the library is written against
 * (decision 14). `put` rejects with StorageFullError on quota.
 */
interface LibraryStorage {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

/** The localStorage backend behind the async facade. */
const libraryStorage: LibraryStorage = {
  get: (key) => Promise.resolve(getItemSync(key)),
  put: (key, value) => {
    putItemSync(key, value);
    return Promise.resolve();
  },
  remove: (key) => {
    removeItemSync(key);
    return Promise.resolve();
  },
  list: (prefix) => Promise.resolve(listKeysSync(prefix)),
};

export {
  getItemSync,
  isQuotaExceededError,
  libraryStorage,
  listKeysSync,
  putItemSync,
  removeItemSync,
};
export type { LibraryStorage };
