import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { init } from "@/core/dh";
import { snapshotPresetDocument } from "@/features/preset/document/snapshot";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import { getCurrentPreset } from "@/features/preset/lib/helpers";
import { hashPresetDocument } from "@/features/preset/session/canonical-hash";
import { captureLegacyPresetMeta } from "@/features/preset/session/legacy-preset-meta-capture";
import type { Meta } from "@/features/preset/types/meta";
import type { PresetFileV1 } from "@/features/preset/types/preset";

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

  // Custom presets (loaded from files or URLs)
  customPresets: PresetFileV1[];

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
  loadPreset: (preset: PresetFileV1) => void;

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
   * Add a custom preset if not already in default or custom presets
   * Prevents duplicates when loading from URLs or files
   */
  addCustomPreset: (preset: PresetFileV1) => void;

  /**
   * Save current state as a new custom preset
   * Returns the created preset or null if limit reached
   */
  saveCurrentAsNewPreset: (name: string) => PresetFileV1 | null;

  /**
   * Update an existing custom preset with current state
   * Does nothing if preset is not found or is a factory preset
   */
  updateCustomPreset: (id: string) => void;

  /**
   * Rename a custom preset
   * Does nothing if preset is not found or is a factory preset
   */
  renameCustomPreset: (id: string, newName: string) => void;

  /**
   * Duplicate a custom preset
   * Returns the duplicated preset
   */
  duplicateCustomPreset: (id: string) => PresetFileV1;

  /**
   * Delete a custom preset
   * Does nothing if preset is not found
   */
  deleteCustomPreset: (id: string) => void;

  /**
   * Get a custom preset by ID
   */
  getCustomPresetById: (id: string) => PresetFileV1 | undefined;

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
    persist(
      immer((set, get) => ({
        // Initial state - init preset "init.dh". The clean baseline starts
        // null (nothing to compare against); bootstrapSession always applies
        // a document before React mounts, which sets it.
        currentPresetMeta: init().meta,
        currentKitMeta: init().kit.meta,
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

        loadPreset: (preset) => {
          set((state) => {
            state.currentPresetMeta = preset.meta;
            state.currentKitMeta = preset.kit.meta;
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

        addCustomPreset: (preset) => {
          set((state) => {
            // Check if already in custom presets
            const exists = state.customPresets.some(
              (p) => p.meta.id === preset.meta.id,
            );
            if (!exists) {
              // Insert at front so most recent shows first
              state.customPresets.unshift(preset);
            }
          });
        },

        saveCurrentAsNewPreset: (name) => {
          const { customPresets, currentPresetMeta, currentKitMeta } = get();

          // Check limit
          if (customPresets.length >= MAX_CUSTOM_PRESETS) {
            return null;
          }

          // Get current state from all stores
          const currentState = getCurrentPreset(
            currentPresetMeta,
            currentKitMeta,
          );

          // Create new preset with new ID and metadata
          const newPreset: PresetFileV1 = {
            ...currentState,
            meta: {
              id: crypto.randomUUID(),
              name,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };

          // Add to custom presets
          set((state) => {
            state.customPresets.unshift(newPreset);
          });

          return newPreset;
        },

        updateCustomPreset: (id) => {
          let saved = false;
          set((state) => {
            const index = state.customPresets.findIndex(
              (p) => p.meta.id === id,
            );
            if (index === -1) return;

            // Get current state
            const currentState = getCurrentPreset(
              state.currentPresetMeta,
              state.currentKitMeta,
            );

            // Update preset in place, preserving original ID and metadata
            state.customPresets[index] = {
              ...currentState,
              meta: {
                ...state.customPresets[index].meta,
                updatedAt: new Date().toISOString(),
              },
            };

            saved = true;
          });

          // The saved state IS the current state, so reset the clean
          // baseline from the live snapshot.
          if (saved) get().markPresetClean();
        },

        renameCustomPreset: (id, newName) => {
          set((state) => {
            const preset = state.customPresets.find((p) => p.meta.id === id);
            if (!preset) return;

            preset.meta.name = newName;
            preset.meta.updatedAt = new Date().toISOString();

            // If this is the current preset, update current meta too
            if (state.currentPresetMeta.id === id) {
              state.currentPresetMeta.name = newName;
              state.currentPresetMeta.updatedAt = new Date().toISOString();
            }
          });
        },

        duplicateCustomPreset: (id) => {
          const { customPresets } = get();
          const sourcePreset = customPresets.find((p) => p.meta.id === id);

          if (!sourcePreset) {
            throw new Error(`Preset with id ${id} not found`);
          }

          // Create duplicate with new ID and timestamps
          const duplicatedPreset: PresetFileV1 = {
            ...sourcePreset,
            meta: {
              ...sourcePreset.meta,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };

          // Add to custom presets
          set((state) => {
            state.customPresets.unshift(duplicatedPreset);
          });

          return duplicatedPreset;
        },

        deleteCustomPreset: (id) => {
          set((state) => {
            state.customPresets = state.customPresets.filter(
              (p) => p.meta.id !== id,
            );
          });
        },

        getCustomPresetById: (id) => {
          return get().customPresets.find((p) => p.meta.id === id);
        },

        isCustomPreset: (id) => {
          const defaultPresets = getDefaultPresets();
          const isFactory = defaultPresets.some((p) => p.meta.id === id);
          return !isFactory;
        },

        canAddCustomPreset: () => {
          return get().customPresets.length < MAX_CUSTOM_PRESETS;
        },
      })),
      {
        name: "drumhaus-preset-meta-storage",
        // v2 (PR 5): currentPresetMeta/currentKitMeta moved into the session
        // document (features/preset/session); only the library remains here
        // (PR 6's territory). cleanHash is runtime state persisted in the
        // session envelope, never here.
        version: 2,
        partialize: (state) => ({
          customPresets: state.customPresets,
        }),
        migrate: (persistedState: unknown, version: number) => {
          if (version < 2) {
            // Hand the dropped meta fields to the legacy session adopter
            // before zustand's post-migration write-back narrows the
            // envelope (see legacy-preset-meta-capture.ts).
            captureLegacyPresetMeta(persistedState);
            const state = persistedState as {
              customPresets?: PresetFileV1[];
            } | null;
            return { customPresets: state?.customPresets ?? [] };
          }
          return persistedState;
        },
      },
    ),
    {
      name: "PresetMetaStore",
    },
  ),
);

export { usePresetMetaStore };
