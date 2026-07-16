import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { init } from "@/core/dh";
import { loadKit } from "@/core/dhkit";
import type { PresetDocument } from "@/features/preset/document";
import { snapshotPresetDocument } from "@/features/preset/document/snapshot";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import {
  putLibraryEntry,
  removeLibraryEntry,
  writeLibraryIndex,
} from "@/features/preset/library/library";
import { hashPresetDocument } from "@/features/preset/session/canonical-hash";
import type { Meta } from "@/features/preset/types/meta";

/**
 * Maximum number of custom presets allowed in storage
 */
const MAX_CUSTOM_PRESETS = 100;

interface PresetMetaState {
  // Current preset and kit metadata
  currentPresetMeta: Meta;
  currentKitMeta: Meta;

  /**
   * Canonical hash of the last clean (loaded/saved) state's document, for
   * change detection. Not persisted here: it survives reloads inside the
   * session envelope (features/preset/session), so dirty tracking is
   * reload-stable by construction.
   */
  cleanHash: string | null;

  /**
   * The in-memory preset library: full documents in index order, hydrated
   * from per-preset storage entries at boot (features/preset/library).
   * This store is no longer persisted; storage entries and the index are
   * written per mutation, and the index self-heals against entry meta at
   * boot, so memory and storage cannot version-skew.
   */
  customPresets: PresetDocument[];

  // Actions
  setPresetMeta: (meta: Meta) => void;
  setKitMeta: (meta: Meta) => void;

  /**
   * Load a preset's metadata (current preset and kit meta).
   *
   * Deliberately does NOT touch the clean baseline: this runs at the start
   * of applyPresetDocument's commit phase, before the musical stores are
   * written, and the baseline must hash the APPLIED state (the post-apply
   * snapshot), which applyPresetDocument sets via markPresetClean.
   */
  loadPreset: (presetMeta: Meta, kitMeta: Meta) => void;

  /**
   * Reset the clean baseline to the current store state: hash the live
   * snapshot and store it. Call after a load or save completes.
   */
  markPresetClean: () => void;

  /**
   * Set the clean baseline to a known hash (session restore: the envelope's
   * persisted baseline, which may differ from the current state's hash when
   * the session was closed dirty).
   */
  setCleanHash: (hash: string | null) => void;

  /**
   * Check if current state differs from the clean baseline
   */
  hasUnsavedChanges: () => boolean;

  /**
   * Replace the in-memory library with the boot-hydrated documents
   * (bootstrapLibrary; must run before any preset document is applied so
   * addCustomPreset's dedupe sees the real library).
   */
  hydrateLibrary: (documents: PresetDocument[]) => void;

  /**
   * Add a preset document to the library if not already present (dedupe by
   * id, most recent first). Called synchronously from applyPresetDocument
   * when a non-factory preset loads (file import, share link), so the
   * storage write is best-effort: a failure keeps the preset in memory for
   * this session and logs.
   */
  addCustomPreset: (document: PresetDocument) => void;

  /**
   * Save current state as a new custom preset: snapshot -> entry write ->
   * index -> memory. Returns the created document, or null if the library
   * limit is reached.
   *
   * @throws {StorageFullError} If the browser refused the entry write
   */
  saveCurrentAsNewPreset: (name: string) => Promise<PresetDocument | null>;

  /**
   * Update an existing custom preset with current state.
   * Does nothing if the preset is not in the library.
   *
   * @throws {StorageFullError} If the browser refused the entry write
   */
  updateCustomPreset: (id: string) => Promise<void>;

  /**
   * Rename a custom preset: rewrites the entry's meta AND the index row.
   * Does nothing if the preset is not in the library.
   *
   * @throws {StorageFullError} If the browser refused the entry write
   */
  renameCustomPreset: (id: string, newName: string) => Promise<void>;

  /**
   * Duplicate a custom preset. Returns the duplicated document.
   *
   * @throws {StorageFullError} If the browser refused the entry write
   */
  duplicateCustomPreset: (id: string) => Promise<PresetDocument>;

  /**
   * Delete a custom preset (entry, index row, and memory).
   * Does nothing if preset is not found.
   */
  deleteCustomPreset: (id: string) => Promise<void>;

  /**
   * Get a custom preset by ID
   */
  getCustomPresetById: (id: string) => PresetDocument | undefined;

  /**
   * Check if a preset ID is a custom preset (not factory)
   */
  isCustomPreset: (id: string) => boolean;

  /**
   * Check if more custom presets can be added (under MAX_CUSTOM_PRESETS limit)
   */
  canAddCustomPreset: () => boolean;
}

const usePresetMetaStore = create<PresetMetaState>()(
  devtools(
    immer((set, get) => {
      /**
       * Rewrite the index from the in-memory order. The entry write is the
       * one that must succeed (entry meta is truth); the index is a cache,
       * so its write is best-effort and boot self-heal repairs a miss.
       */
      const persistIndexFromMemory = () => {
        const rows = get().customPresets.map((document) => ({
          id: document.meta.id,
          name: document.meta.name,
        }));
        void writeLibraryIndex(rows).catch((error: unknown) => {
          console.error(
            "Drumhaus library: failed to write the index; " +
              "the next boot rebuilds it from the entries",
            error,
          );
        });
      };

      return {
        // Initial state - init preset "init.dh". The clean baseline starts
        // null (nothing to compare against); bootstrapSession always applies
        // a document before React mounts, which sets it. The library starts
        // empty and hydrates in the same boot pass.
        currentPresetMeta: init().meta,
        currentKitMeta: loadKit(init().kit.id)!.meta,
        cleanHash: null,
        customPresets: [],

        // Actions
        setPresetMeta: (meta) => {
          set((state) => {
            state.currentPresetMeta = meta;
          });
        },

        setKitMeta: (meta) => {
          set((state) => {
            state.currentKitMeta = meta;
          });
        },

        loadPreset: (presetMeta, kitMeta) => {
          set((state) => {
            state.currentPresetMeta = presetMeta;
            state.currentKitMeta = kitMeta;
          });
        },

        markPresetClean: () => {
          const { currentPresetMeta, currentKitMeta } = get();
          const hash = hashPresetDocument(
            snapshotPresetDocument(currentPresetMeta, currentKitMeta),
          );
          set((state) => {
            state.cleanHash = hash;
          });
        },

        setCleanHash: (hash) => {
          set((state) => {
            state.cleanHash = hash;
          });
        },

        hasUnsavedChanges: () => {
          const { cleanHash, currentPresetMeta, currentKitMeta } = get();

          if (cleanHash === null) return false;

          // The canonical hash rounds away knob<->domain float noise and
          // excludes meta.updatedAt (minted fresh on every snapshot), so
          // this comparison is exactly "did the user edit anything".
          const currentHash = hashPresetDocument(
            snapshotPresetDocument(currentPresetMeta, currentKitMeta),
          );

          return currentHash !== cleanHash;
        },

        hydrateLibrary: (documents) => {
          set((state) => {
            state.customPresets = documents;
          });
        },

        addCustomPreset: (document) => {
          const exists = get().customPresets.some(
            (preset) => preset.meta.id === document.meta.id,
          );
          if (exists) return;

          // Insert at front so most recent shows first
          set((state) => {
            state.customPresets.unshift(document);
          });

          // Best-effort persistence (see the interface doc): entry first,
          // then the index, mirroring the awaited mutations.
          void putLibraryEntry(document)
            .then(() => {
              persistIndexFromMemory();
            })
            .catch((error: unknown) => {
              console.error(
                "Drumhaus library: failed to persist the imported preset " +
                  `"${document.meta.name}"; it stays available this session`,
                error,
              );
            });
        },

        saveCurrentAsNewPreset: async (name) => {
          const { customPresets, currentKitMeta } = get();

          // Check limit
          if (customPresets.length >= MAX_CUSTOM_PRESETS) {
            return null;
          }

          // Snapshot the live stores as a document under fresh identity.
          const now = new Date().toISOString();
          const document = snapshotPresetDocument(
            {
              id: crypto.randomUUID(),
              name,
              createdAt: now,
              updatedAt: now,
            },
            currentKitMeta,
          );

          // Entry write first: a quota failure throws before memory changes,
          // so the store never claims a save that did not land.
          await putLibraryEntry(document);

          set((state) => {
            state.customPresets.unshift(document);
          });
          persistIndexFromMemory();

          return document;
        },

        updateCustomPreset: async (id) => {
          const { customPresets, currentKitMeta } = get();
          const index = customPresets.findIndex(
            (preset) => preset.meta.id === id,
          );
          if (index === -1) return;

          // Snapshot current state under the entry's identity; the snapshot
          // mints a fresh updatedAt.
          const document = snapshotPresetDocument(
            customPresets[index].meta,
            currentKitMeta,
          );

          await putLibraryEntry(document);

          set((state) => {
            state.customPresets[index] = document;
          });
          persistIndexFromMemory();

          // The saved state IS the current state, so reset the clean
          // baseline from the live snapshot.
          get().markPresetClean();
        },

        renameCustomPreset: async (id, newName) => {
          const { customPresets, currentPresetMeta, hasUnsavedChanges } = get();
          const index = customPresets.findIndex(
            (preset) => preset.meta.id === id,
          );
          if (index === -1) return;

          // When renaming the CURRENT preset, a clean session must stay
          // clean: the baseline hash includes meta.name, so it is
          // recomputed after the rename. A dirty session stays dirty (the
          // baseline keeps pointing at the last saved content).
          const isCurrent = currentPresetMeta.id === id;
          const wasClean = isCurrent && !hasUnsavedChanges();

          const now = new Date().toISOString();
          const renamed: PresetDocument = {
            ...customPresets[index],
            meta: {
              ...customPresets[index].meta,
              name: newName,
              updatedAt: now,
            },
          };

          // Rename rewrites the entry's meta AND the index row.
          await putLibraryEntry(renamed);

          set((state) => {
            state.customPresets[index] = renamed;
            if (isCurrent) {
              state.currentPresetMeta.name = newName;
              state.currentPresetMeta.updatedAt = now;
            }
          });
          persistIndexFromMemory();

          if (wasClean) get().markPresetClean();
        },

        duplicateCustomPreset: async (id) => {
          const sourcePreset = get().customPresets.find(
            (preset) => preset.meta.id === id,
          );

          if (!sourcePreset) {
            throw new Error(`Preset with id ${id} not found`);
          }

          // Create duplicate with new ID and timestamps
          const now = new Date().toISOString();
          const duplicatedPreset: PresetDocument = {
            ...sourcePreset,
            meta: {
              ...sourcePreset.meta,
              id: crypto.randomUUID(),
              createdAt: now,
              updatedAt: now,
            },
          };

          await putLibraryEntry(duplicatedPreset);

          set((state) => {
            state.customPresets.unshift(duplicatedPreset);
          });
          persistIndexFromMemory();

          return duplicatedPreset;
        },

        deleteCustomPreset: async (id) => {
          await removeLibraryEntry(id);

          set((state) => {
            state.customPresets = state.customPresets.filter(
              (preset) => preset.meta.id !== id,
            );
          });
          persistIndexFromMemory();
        },

        getCustomPresetById: (id) => {
          return get().customPresets.find((preset) => preset.meta.id === id);
        },

        isCustomPreset: (id) => {
          const defaultPresets = getDefaultPresets();
          const isFactory = defaultPresets.some((p) => p.meta.id === id);
          return !isFactory;
        },

        canAddCustomPreset: () => {
          return get().customPresets.length < MAX_CUSTOM_PRESETS;
        },
      };
    }),
    {
      name: "PresetMetaStore",
    },
  ),
);

export { usePresetMetaStore };
