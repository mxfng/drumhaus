import { useCallback, useEffect, useMemo } from "react";

import { useToast } from "@/components/ui";
import { getAllKits } from "@/lib/kit/constants";
import { getDefaultPresets } from "@/lib/preset/constants";
import {
  createPresetForExport,
  downloadPreset,
  generateShareUrl,
  parsePresetFile,
} from "@/lib/preset/operations";
import { useDialogStore } from "@/stores/useDialogStore";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import type { KitFileV1 } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";

interface UsePresetManagerProps {
  /**
   * Load preset function from usePresetLoading
   * This orchestrates updating all stores and stopping playback
   *
   * Externalized because it depends on instrument runtimes and
   * is defined in usePresetLoading hook.
   */
  loadPreset: (preset: PresetFileV1) => void;
}

export interface UsePresetManagerResult {
  // Data
  kits: KitFileV1[];
  defaultPresets: PresetFileV1[];
  customPresets: PresetFileV1[];
  allPresets: PresetFileV1[];

  // Actions
  switchKit: (kitId: string) => void;
  switchPreset: (presetId: string) => void;
  handlePreset: (preset: PresetFileV1) => void;
  importPreset: () => void;
  exportPreset: (name: string) => void;
  sharePreset: (name: string) => Promise<string>;
}

export function usePresetManager({
  loadPreset,
}: UsePresetManagerProps): UsePresetManagerResult {
  const { toast } = useToast();

  // Store state
  const setAllInstruments = useInstrumentsStore(
    (state) => state.setAllInstruments,
  );
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);
  const setKitMeta = usePresetMetaStore((state) => state.setKitMeta);
  const markPresetClean = usePresetMetaStore((state) => state.markPresetClean);
  const hasUnsavedChanges = usePresetMetaStore(
    (state) => state.hasUnsavedChanges,
  );
  const customPresets = usePresetMetaStore((state) => state.customPresets);
  const addCustomPreset = usePresetMetaStore((state) => state.addCustomPreset);

  // Dialog state
  const openDialog = useDialogStore((state) => state.openDialog);

  const kits = useMemo(() => getAllKits(), []);
  const defaultPresets = useMemo(() => getDefaultPresets(), []);
  const allPresets = useMemo(
    () => [...defaultPresets, ...customPresets],
    [defaultPresets, customPresets],
  );

  // --- Core Operations ---

  /**
   * Check if a preset should be added to custom presets
   * Returns true if not in default presets
   */
  const isCustomPreset = useCallback(
    (preset: PresetFileV1): boolean => {
      return !defaultPresets.some((p) => p.meta.id === preset.meta.id);
    },
    [defaultPresets],
  );

  /**
   * Load a preset and track it in custom presets if needed
   *
   * A wrapper function that I am not happy with the name of
   */
  const handlePreset = useCallback(
    (preset: PresetFileV1) => {
      // Add to custom presets if it's not a default preset
      if (isCustomPreset(preset)) {
        addCustomPreset(preset);
      }

      // Load the preset (updates all stores, stops playback)
      loadPreset(preset);
    },
    [loadPreset, addCustomPreset, isCustomPreset],
  );

  /**
   * Switch to a different kit
   */
  const switchKit = useCallback(
    (kitId: string) => {
      const kit = kits.find((k) => k.meta.id === kitId);
      if (!kit) {
        console.error(`Kit ${kitId} not found`);
        return;
      }

      setAllInstruments(kit.instruments);
      setKitMeta(kit.meta);
    },
    [kits, setAllInstruments, setKitMeta],
  );

  /**
   * Switch to a preset by ID
   * Checks for unsaved changes first
   */
  const switchPreset = useCallback(
    (presetId: string) => {
      if (hasUnsavedChanges()) {
        openDialog("presetChange", { presetToChange: presetId });
        return;
      }

      const preset = allPresets.find((p) => p.meta.id === presetId);
      if (!preset) {
        console.error(`Preset ${presetId} not found`);
        return;
      }

      handlePreset(preset);
    },
    [hasUnsavedChanges, allPresets, handlePreset, openDialog],
  );

  // --- File Operations ---

  /**
   * Export current state as a .dh file
   */
  const exportPreset = useCallback(
    (name: string) => {
      const preset = createPresetForExport(name, currentKitMeta);

      // Download file
      downloadPreset(preset, name);

      // Update state
      markPresetClean(preset);
      handlePreset(preset);
    },
    [currentKitMeta, markPresetClean, handlePreset],
  );

  /**
   * Import a preset from a .dh file
   */
  const importPreset = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".dh";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== "string") throw new Error("Invalid file");

          const preset = parsePresetFile(result);
          handlePreset(preset);
        } catch (error) {
          console.error("Failed to import preset:", error);
          toast({
            title: "Something went wrong",
            description:
              error instanceof Error
                ? error.message
                : "Couldn't open file. It may be invalid or corrupted.",
            status: "error",
            duration: 8000,
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: "Something went wrong",
          description: "There was a problem reading the file.",
          status: "error",
          duration: 8000,
        });
      };
      reader.readAsText(file);
    };
    input.click();
  }, [handlePreset, toast]);

  // --- SHARING ---

  /**
   * Generate a shareable URL for the current preset
   */
  const sharePreset = useCallback(
    async (name: string): Promise<string> => {
      // Use the preset meta with the provided name for sharing
      const metaWithName = { ...currentPresetMeta, name };
      return generateShareUrl(metaWithName, currentKitMeta);
    },
    [currentPresetMeta, currentKitMeta],
  );

  // --- EFFECTS ---

  // Add current preset to custom presets on mount/changes if loaded from URL
  useEffect(() => {
    if (isCustomPreset({ meta: currentPresetMeta } as PresetFileV1)) {
      // Note: We can't add the full preset here because we'd need to construct it
      // from all stores. The preset loading hook handles this when loading from URL.
    }
  }, [currentPresetMeta, isCustomPreset]);

  // --- RETURN API ---

  return {
    // Data
    kits,
    defaultPresets,
    customPresets,
    allPresets,

    // Actions
    switchKit,
    switchPreset,
    handlePreset,
    importPreset,
    exportPreset,
    sharePreset,
  };
}
