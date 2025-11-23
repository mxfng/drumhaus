/**
 * IndexedDB utilities for storing FileSystemDirectoryHandle
 * localStorage cannot serialize these handles, so IndexedDB is required
 */

const DB_NAME = "drumhaus-storage";
const DB_VERSION = 1;
const STORE_NAME = "file-handles";
const PRESET_FOLDER_KEY = "preset-folder-handle";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function savePresetFolderHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, PRESET_FOLDER_KEY);

    request.onerror = () => {
      reject(new Error("Failed to save folder handle"));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

export async function getPresetFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(PRESET_FOLDER_KEY);

      request.onerror = () => {
        reject(new Error("Failed to get folder handle"));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch {
    return null;
  }
}

export async function removePresetFolderHandle(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(PRESET_FOLDER_KEY);

    request.onerror = () => {
      reject(new Error("Failed to remove folder handle"));
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Check if the File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    "showDirectoryPicker" in window && "FileSystemDirectoryHandle" in window
  );
}

/**
 * Request permission to access a stored directory handle
 * Returns true if permission was granted, false otherwise
 */
export async function requestFolderPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    // Check current permission state
    const options = { mode: "readwrite" as const };

    // queryPermission and requestPermission may not be available in all browsers
    if ("queryPermission" in handle) {
      const permission = await (handle as any).queryPermission(options);
      if (permission === "granted") {
        return true;
      }
    }

    // Request permission
    if ("requestPermission" in handle) {
      const permission = await (handle as any).requestPermission(options);
      return permission === "granted";
    }

    return false;
  } catch {
    return false;
  }
}
