import { useCallback, useMemo } from "react";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { getAllKits } from "@/features/kit/lib/constants";
import { KitFileV1 } from "@/features/kit/types/kit";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import {
  createPresetForExport,
  downloadPreset,
  generateShareUrl,
  parsePresetFile,
} from "@/features/preset/lib/operations";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { useToast } from "@/shared/ui";

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
  importPreset: () => void;
  exportPreset: (name: string) => void;
  sharePreset: (name: string) => Promise<string>;
}

/**
 * Manages preset operations and state
 *
 * High-level: provides UI operations (import, export, share, switch)
 *
 * Depends on loadPreset from usePresetLoading hook, which manages
 * low level runtime updates
 */
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

      loadPreset(preset);
    },
    [hasUnsavedChanges, allPresets, loadPreset, openDialog],
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
      loadPreset(preset);
    },
    [currentKitMeta, markPresetClean, loadPreset],
  );

  /**
   * Import a preset from a .dh file
   */
  const importPreset = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".dh,.dh.json,application/json,application/octet-stream";
    input.style.display = "none";

    const cleanup = () => {
      input.value = "";
      input.onchange = null;
      input.onerror = null;
      input.remove();
    };

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        cleanup();
        return;
      }

      const fileName = file.name.toLowerCase();
      const isDh = fileName.endsWith(".dh") || fileName.endsWith(".dh.json");
      if (!isDh) {
        toast({
          title: "Unsupported file",
          description: "Please select a .dh preset file.",
          status: "error",
          duration: 6000,
        });
        cleanup();
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result !== "string") throw new Error("Invalid file");

          const preset = parsePresetFile(result);
          loadPreset(preset);
          toast({
            title: "Preset loaded",
            description: preset.meta.name,
            status: "success",
          });
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
        } finally {
          cleanup();
        }
      };
      reader.onerror = () => {
        toast({
          title: "Something went wrong",
          description: "There was a problem reading the file.",
          status: "error",
          duration: 8000,
        });
        cleanup();
      };
      reader.readAsText(file);
    };
    input.onerror = cleanup;
    document.body.appendChild(input);
    input.click();
  }, [loadPreset, toast]);

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
    importPreset,
    exportPreset,
    sharePreset,
  };
}
