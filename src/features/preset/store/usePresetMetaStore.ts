import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { init } from "@/core/dh";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import { getCurrentPreset } from "@/features/preset/lib/helpers";
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

  // Snapshot of last loaded/saved preset for change detection
  cleanPreset: PresetFileV1 | null;

  // Custom presets (loaded from files or URLs)
  customPresets: PresetFileV1[];

  // Actions
  setPresetMeta: (meta: Meta) => void;
  setKitMeta: (meta: Meta) => void;

  /**
   * Load a preset and update all metadata
   * Sets both current meta and cleanPreset snapshot
   */
  loadPreset: (preset: PresetFileV1) => void;

  /**
   * Update cleanPreset to current state after saving
   * Call this after successfully saving a preset
   */
  markPresetClean: (preset: PresetFileV1) => void;

  /**
   * Check if current state differs from cleanPreset
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

export const usePresetMetaStore = create<PresetMetaState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state - init preset "init.dh"
        currentPresetMeta: init().meta,
        currentKitMeta: init().kit.meta,
        cleanPreset: init(),
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
            state.cleanPreset = preset;
          });
        },

        markPresetClean: (preset) => {
          set((state) => {
            state.cleanPreset = preset;
            state.currentPresetMeta = {
              ...preset.meta,
              updatedAt: new Date().toISOString(),
            };
          });
        },

        hasUnsavedChanges: () => {
          const { cleanPreset, currentPresetMeta, currentKitMeta } = get();

          if (!cleanPreset) return false;

          // Get current state from all stores
          const currentPreset = getCurrentPreset(
            currentPresetMeta,
            currentKitMeta,
          );

          // Compare by stringifying (exclude updatedAt since that's only for saves)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const cleanMetaRest = (({ updatedAt: _updatedAt, ...rest }) => rest)(
            cleanPreset.meta,
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const currentMetaRest = (({ updatedAt: _updatedAt, ...rest }) =>
            rest)(currentPreset.meta);
          const cleanCopy = { ...cleanPreset, meta: cleanMetaRest };
          const currentCopy = { ...currentPreset, meta: currentMetaRest };

          return JSON.stringify(cleanCopy) !== JSON.stringify(currentCopy);
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

            // Update cleanPreset to mark as saved
            state.cleanPreset = state.customPresets[index];
          });
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
        version: 1,
        // Persist current meta, history, and custom presets (but not cleanPreset - runtime only)
        partialize: (state) => ({
          currentPresetMeta: state.currentPresetMeta,
          currentKitMeta: state.currentKitMeta,
          customPresets: state.customPresets,
        }),
      },
    ),
    {
      name: "PresetMetaStore",
    },
  ),
);
