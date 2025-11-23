import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  savePresetToFolder,
  scanPresetFolder,
  updatePresetFile,
  type ScannedPreset,
} from "@/lib/preset/folderScanner";
import {
  getPresetFolderHandle,
  removePresetFolderHandle,
  requestFolderPermission,
  savePresetFolderHandle,
} from "@/lib/storage/indexedDb";
import type { PresetFileV1 } from "@/types/preset";

export type FolderStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "permission_required"
  | "error";

interface PresetFolderState {
  // Folder state
  folderName: string | null;
  status: FolderStatus;
  errorMessage: string | null;

  // Presets loaded from folder
  userPresets: ScannedPreset[];

  // Internal handle reference (not persisted in Zustand, managed via IndexedDB)
  _directoryHandle: FileSystemDirectoryHandle | null;

  // Actions
  /**
   * Prompt user to select a preset folder
   */
  selectFolder: () => Promise<void>;

  /**
   * Disconnect from current folder
   */
  disconnectFolder: () => Promise<void>;

  /**
   * Initialize from IndexedDB on app startup
   */
  initializeFromStorage: () => Promise<void>;

  /**
   * Re-scan the current folder for presets
   */
  rescanFolder: () => Promise<void>;

  /**
   * Save a preset to the linked folder
   */
  saveToFolder: (
    preset: PresetFileV1,
    fileName?: string,
  ) => Promise<FileSystemFileHandle>;

  /**
   * Update an existing preset file in the folder
   */
  updateInFolder: (
    preset: PresetFileV1,
    fileHandle: FileSystemFileHandle,
  ) => Promise<void>;

  /**
   * Get a preset's file handle by preset ID
   */
  getFileHandle: (presetId: string) => FileSystemFileHandle | null;
}

export const usePresetFolderStore = create<PresetFolderState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      folderName: null,
      status: "disconnected",
      errorMessage: null,
      userPresets: [],
      _directoryHandle: null,

      // Actions
      selectFolder: async () => {
        try {
          set((state) => {
            state.status = "connecting";
            state.errorMessage = null;
          });

          // Show folder picker
          const handle = await window.showDirectoryPicker({
            mode: "readwrite",
          });

          // Save to IndexedDB
          await savePresetFolderHandle(handle);

          // Scan for presets
          const { presets, errors } = await scanPresetFolder(handle);

          set((state) => {
            state._directoryHandle = handle;
            state.folderName = handle.name;
            state.userPresets = presets;
            state.status = "connected";

            if (errors.length > 0) {
              state.errorMessage = `${errors.length} file(s) could not be loaded`;
            }
          });
        } catch (err) {
          // User cancelled or error occurred
          if (err instanceof Error && err.name === "AbortError") {
            // User cancelled - reset to previous state
            set((state) => {
              state.status = state._directoryHandle
                ? "connected"
                : "disconnected";
            });
            return;
          }

          set((state) => {
            state.status = "error";
            state.errorMessage =
              err instanceof Error ? err.message : "Failed to select folder";
          });
        }
      },

      disconnectFolder: async () => {
        await removePresetFolderHandle();

        set((state) => {
          state._directoryHandle = null;
          state.folderName = null;
          state.status = "disconnected";
          state.errorMessage = null;
          state.userPresets = [];
        });
      },

      initializeFromStorage: async () => {
        try {
          const handle = await getPresetFolderHandle();

          if (!handle) {
            // No saved folder
            return;
          }

          set((state) => {
            state.status = "connecting";
          });

          // Request permission
          const hasPermission = await requestFolderPermission(handle);

          if (!hasPermission) {
            set((state) => {
              state._directoryHandle = handle;
              state.folderName = handle.name;
              state.status = "permission_required";
            });
            return;
          }

          // Scan for presets
          const { presets, errors } = await scanPresetFolder(handle);

          set((state) => {
            state._directoryHandle = handle;
            state.folderName = handle.name;
            state.userPresets = presets;
            state.status = "connected";

            if (errors.length > 0) {
              state.errorMessage = `${errors.length} file(s) could not be loaded`;
            }
          });
        } catch (err) {
          set((state) => {
            state.status = "error";
            state.errorMessage =
              err instanceof Error
                ? err.message
                : "Failed to restore folder connection";
          });
        }
      },

      rescanFolder: async () => {
        const { _directoryHandle } = get();

        if (!_directoryHandle) {
          return;
        }

        try {
          const { presets, errors } = await scanPresetFolder(_directoryHandle);

          set((state) => {
            state.userPresets = presets;
            state.errorMessage =
              errors.length > 0
                ? `${errors.length} file(s) could not be loaded`
                : null;
          });
        } catch (err) {
          set((state) => {
            state.errorMessage =
              err instanceof Error ? err.message : "Failed to scan folder";
          });
        }
      },

      saveToFolder: async (preset, fileName) => {
        const { _directoryHandle } = get();

        if (!_directoryHandle) {
          throw new Error("No folder connected");
        }

        const fileHandle = await savePresetToFolder(
          _directoryHandle,
          preset,
          fileName,
        );

        // Re-scan to update the list
        await get().rescanFolder();

        return fileHandle;
      },

      updateInFolder: async (preset, fileHandle) => {
        await updatePresetFile(fileHandle, preset);

        // Re-scan to update the list
        await get().rescanFolder();
      },

      getFileHandle: (presetId) => {
        const { userPresets } = get();
        const found = userPresets.find((p) => p.preset.meta.id === presetId);
        return found?.fileHandle || null;
      },
    })),
    {
      name: "PresetFolderStore",
    },
  ),
);
