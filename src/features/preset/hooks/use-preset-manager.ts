import { useCallback, useMemo } from "react";

import { init } from "@/core/dh";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { getAllKits } from "@/features/kit/lib/constants";
import { KitFileV1 } from "@/features/kit/types/kit";
import type { PresetDocument } from "@/features/preset/document";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import {
  createPresetForExport,
  downloadPreset,
  generateShareUrl,
} from "@/features/preset/lib/operations";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { useDialogStore } from "@/shared/store/use-dialog-store";
import { useToast } from "@/shared/ui";

interface UsePresetManagerProps {
  /**
   * Preset loaders from usePresetLoading: the document pipeline entry
   * points (decode/migrate/validate -> apply), which orchestrate updating
   * all stores, stopping playback, and the shared error boundary.
   *
   * Externalized because they depend on instrument runtimes and
   * are defined in usePresetLoading hook.
   */
  loadPresetFile: (preset: PresetFileV1) => void;
  loadPresetFileText: (text: string) => PresetDocument | null;
}

interface UsePresetManagerResult {
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

  // Preset management
  saveCurrentPreset: (name?: string) => void;
  renamePreset: (id: string, newName: string) => void;
  duplicatePreset: (id: string, newName?: string) => PresetFileV1;
  deletePreset: (id: string) => void;
  isCurrentPresetCustom: boolean;
  canAddMorePresets: boolean;
}

/**
 * Manages preset operations and state
 *
 * High-level: provides UI operations (import, export, share, switch)
 *
 * Depends on loadPreset from usePresetLoading hook, which manages
 * low level runtime updates
 */
function usePresetManager({
  loadPresetFile,
  loadPresetFileText,
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

  // Store actions for preset management
  const saveCurrentAsNewPreset = usePresetMetaStore(
    (state) => state.saveCurrentAsNewPreset,
  );
  const updateCustomPreset = usePresetMetaStore(
    (state) => state.updateCustomPreset,
  );
  const renameCustomPreset = usePresetMetaStore(
    (state) => state.renameCustomPreset,
  );
  const duplicateCustomPreset = usePresetMetaStore(
    (state) => state.duplicateCustomPreset,
  );
  const deleteCustomPreset = usePresetMetaStore(
    (state) => state.deleteCustomPreset,
  );
  const isCustomPreset = usePresetMetaStore((state) => state.isCustomPreset);
  const canAddCustomPreset = usePresetMetaStore(
    (state) => state.canAddCustomPreset,
  );

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
        openDialog("presetChange", { preset: { id: presetId } });
        return;
      }

      const preset = allPresets.find((p) => p.meta.id === presetId);
      if (!preset) {
        console.error(`Preset ${presetId} not found`);
        return;
      }

      loadPresetFile(preset);
    },
    [hasUnsavedChanges, allPresets, loadPresetFile, openDialog],
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
      loadPresetFile(preset);
    },
    [currentKitMeta, markPresetClean, loadPresetFile],
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
        const result = e.target?.result;
        if (typeof result !== "string") {
          toast({
            title: "Something went wrong",
            description: "There was a problem reading the file.",
            status: "error",
            duration: 8000,
          });
          cleanup();
          return;
        }

        // The pipeline's shared error boundary toasts on failure.
        const loaded = loadPresetFileText(result);
        if (loaded !== null) {
          toast({
            title: "Preset loaded",
            description: loaded.meta.name,
            status: "success",
          });
        }
        cleanup();
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
  }, [loadPresetFileText, toast]);

  // --- PRESET MANAGEMENT ---

  /**
   * Save current state as a new preset or update existing custom preset
   */
  const saveCurrentPreset = useCallback(
    (name?: string) => {
      const isCustom = isCustomPreset(currentPresetMeta.id);

      if (isCustom) {
        // Update existing custom preset
        updateCustomPreset(currentPresetMeta.id);
        toast({
          title: "Preset updated",
          description: currentPresetMeta.name,
          duration: 3000,
        });
      } else if (name) {
        // Save factory preset as new custom preset
        const newPreset = saveCurrentAsNewPreset(name);
        if (newPreset) {
          markPresetClean(newPreset);
          loadPresetFile(newPreset);
          toast({
            title: "Preset saved",
            description: name,
            duration: 3000,
          });
        } else {
          toast({
            title: "Preset limit reached",
            description: "Delete some presets to continue (max 100)",
            status: "error",
            duration: 5000,
          });
        }
      }
    },
    [
      isCustomPreset,
      currentPresetMeta,
      updateCustomPreset,
      saveCurrentAsNewPreset,
      markPresetClean,
      loadPresetFile,
      toast,
    ],
  );

  /**
   * Rename a custom preset
   */
  const renamePreset = useCallback(
    (id: string, newName: string) => {
      renameCustomPreset(id, newName);
      toast({
        title: "Preset renamed",
        description: `Renamed to "${newName}"`,
        duration: 3000,
      });
    },
    [renameCustomPreset, toast],
  );

  /**
   * Duplicate a custom preset
   */
  const duplicatePreset = useCallback(
    (id: string, newName?: string): PresetFileV1 => {
      const duplicated = duplicateCustomPreset(id);

      if (newName && newName !== duplicated.meta.name) {
        renameCustomPreset(duplicated.meta.id, newName);
        duplicated.meta.name = newName;
      }

      toast({
        title: "Preset duplicated",
        description: `Created "${duplicated.meta.name}"`,
        duration: 3000,
      });

      return duplicated;
    },
    [duplicateCustomPreset, renameCustomPreset, toast],
  );

  /**
   * Delete a custom preset
   */
  const deletePreset = useCallback(
    (id: string) => {
      const isDeletingCurrent = id === currentPresetMeta.id;

      deleteCustomPreset(id);

      if (isDeletingCurrent) {
        loadPresetFile(init());
        toast({
          title: "Preset deleted",
          description: "Loaded default preset",
          duration: 3000,
        });
      } else {
        toast({
          title: "Preset deleted",
          duration: 3000,
        });
      }
    },
    [deleteCustomPreset, currentPresetMeta.id, loadPresetFile, toast],
  );

  // Computed values
  const isCurrentPresetCustom = useMemo(
    () => isCustomPreset(currentPresetMeta.id),
    [isCustomPreset, currentPresetMeta.id],
  );

  const canAddMorePresets = useMemo(
    () => canAddCustomPreset(),
    [canAddCustomPreset],
  );

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

    // Preset management
    saveCurrentPreset,
    renamePreset,
    duplicatePreset,
    deletePreset,
    isCurrentPresetCustom,
    canAddMorePresets,
  };
}

export { usePresetManager };
export type { UsePresetManagerResult };
