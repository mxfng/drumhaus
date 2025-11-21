import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { init } from "@/lib/preset";
import { getCurrentPreset } from "@/lib/preset/helpers";
import type { Meta } from "@/types/meta";
import type { PresetFileV1 } from "@/types/preset";

interface PresetMetaState {
  // Current preset and kit metadata
  currentPresetMeta: Meta;
  currentKitMeta: Meta;

  // Snapshot of last loaded/saved preset for change detection
  cleanPreset: PresetFileV1 | null;

  // Recent preset history (last 10 presets)
  recentPresets: Meta[];

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
   * Add a preset to recent history
   */
  addToHistory: (meta: Meta) => void;
}

export const usePresetMetaStore = create<PresetMetaState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state - init preset "init.dh"
        currentPresetMeta: init().meta,
        currentKitMeta: init().kit.meta,
        cleanPreset: init(),
        recentPresets: [init().meta],

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

          // Add to history
          get().addToHistory(preset.meta);
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
          const cleanMetaRest = (({ updatedAt: _updatedAt, ...rest }) => rest)(
            cleanPreset.meta,
          );
          const currentMetaRest = (({ updatedAt: _updatedAt, ...rest }) =>
            rest)(currentPreset.meta);
          const cleanCopy = { ...cleanPreset, meta: cleanMetaRest };
          const currentCopy = { ...currentPreset, meta: currentMetaRest };

          return JSON.stringify(cleanCopy) !== JSON.stringify(currentCopy);
        },

        addToHistory: (meta) => {
          set((state) => {
            // Remove if already exists
            const filtered = state.recentPresets.filter(
              (p: Meta) => p.id !== meta.id,
            );
            // Add to front, keep max 10
            state.recentPresets = [meta, ...filtered].slice(0, 10);
          });
        },
      })),
      {
        name: "drumhaus-preset-meta-storage",
        version: 1,
        // Persist current meta and history, but not cleanPreset (runtime only)
        partialize: (state) => ({
          currentPresetMeta: state.currentPresetMeta,
          currentKitMeta: state.currentKitMeta,
          recentPresets: state.recentPresets,
        }),
      },
    ),
    {
      name: "PresetMetaStore",
    },
  ),
);
