import { useCallback, useMemo } from "react";
import { useToast } from "@/design/ui";

import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { getAllKits } from "@/features/kit/lib/constants";
import { KitFile } from "@/features/kit/types/kit";
import type { PresetDocument } from "@/features/preset/document";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import { generateShareUrl } from "@/features/preset/lib/operations";
import { requestGuardedPresetLoad } from "@/features/preset/store/use-pending-preset-load-store";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";

interface UsePresetManagerProps {
  /**
   * Preset loaders from usePresetLoading: the document pipeline entry
   * points (decode/migrate/validate -> apply), which orchestrate updating
   * all stores, stopping playback, and the shared error boundary.
   *
   * Externalized because they depend on instrument runtimes and
   * are defined in usePresetLoading hook.
   */
  loadPresetDocument: (document: PresetDocument) => void;
  importPresetFileText: (text: string) => void;
}

interface UsePresetManagerResult {
  // Data
  kits: KitFile[];
  defaultPresets: PresetDocument[];
  customPresets: PresetDocument[];

  // Actions
  switchKit: (kitId: string) => void;
  switchPreset: (presetId: string) => void;
  importPreset: () => void;
  sharePreset: (name: string) => Promise<string>;

  // Preset management
  saveCurrentPreset: (name?: string) => Promise<void>;
  isCurrentPresetCustom: boolean;
  canAddMorePresets: boolean;
}

/**
 * Manages preset operations and state
 *
 * High-level: provides UI operations (import, export, share, switch)
 *
 * Depends on the loaders from usePresetLoading hook, which manages
 * low level runtime updates
 */
function usePresetManager({
  loadPresetDocument,
  importPresetFileText,
}: UsePresetManagerProps): UsePresetManagerResult {
  const { toast } = useToast();

  // Store state
  const setAllInstruments = useInstrumentsStore(
    (state) => state.setAllInstruments,
  );
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const setKitMeta = usePresetMetaStore((state) => state.setKitMeta);
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);
  const customPresets = usePresetMetaStore((state) => state.customPresets);

  // Store actions for preset management
  const saveCurrentAsNewPreset = usePresetMetaStore(
    (state) => state.saveCurrentAsNewPreset,
  );
  const updateCustomPreset = usePresetMetaStore(
    (state) => state.updateCustomPreset,
  );
  const isCustomPreset = usePresetMetaStore((state) => state.isCustomPreset);
  const canAddCustomPreset = usePresetMetaStore(
    (state) => state.canAddCustomPreset,
  );

  const kits = useMemo(() => getAllKits(), []);
  const defaultPresets = useMemo(() => getDefaultPresets(), []);

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
   * Switch to a preset by ID, behind the unsaved-changes guard: a dirty
   * session stages the load and opens the confirm dialog
   * (use-pending-preset-load-store.ts); a clean one loads immediately.
   * Library entries are documents and apply DIRECTLY through the pipeline;
   * factory presets run the v1 validate -> migrate ladder.
   */
  const switchPreset = useCallback(
    (presetId: string) => {
      const custom = customPresets.find((d) => d.meta.id === presetId);
      if (custom) {
        requestGuardedPresetLoad("library", () => loadPresetDocument(custom));
        return;
      }

      const factory = defaultPresets.find((p) => p.meta.id === presetId);
      if (!factory) {
        console.error(`Preset ${presetId} not found`);
        return;
      }

      requestGuardedPresetLoad("library", () => loadPresetDocument(factory));
    },
    [customPresets, defaultPresets, loadPresetDocument],
  );

  // --- File Operations ---

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

        // Decode -> unsaved-changes guard -> apply, with the pipeline's
        // shared error boundary toasting on failure (use-preset-loading.ts,
        // importPresetFileText).
        importPresetFileText(result);
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
  }, [importPresetFileText, toast]);

  // --- PRESET MANAGEMENT ---

  /**
   * Save current state as a new preset or update existing custom preset.
   * A refused storage write (StorageFullError from the library) surfaces
   * as an error toast, same pattern as the preset limit.
   */
  const saveCurrentPreset = useCallback(
    async (name?: string) => {
      const isCustom = isCustomPreset(currentPresetMeta.id);

      try {
        if (isCustom) {
          // Update existing custom preset
          await updateCustomPreset(currentPresetMeta.id);
          toast({
            title: "Preset updated",
            description: currentPresetMeta.name,
            duration: 3000,
          });
        } else if (name) {
          // Save factory preset as new custom preset
          const newDocument = await saveCurrentAsNewPreset(name);
          if (newDocument) {
            loadPresetDocument(newDocument);
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
      } catch (error) {
        console.error("Failed to save preset:", error);
        toast({
          title: "Couldn't save preset",
          description:
            error instanceof Error ? error.message : "Please try again",
          status: "error",
          duration: 5000,
        });
      }
    },
    [
      isCustomPreset,
      currentPresetMeta,
      updateCustomPreset,
      saveCurrentAsNewPreset,
      loadPresetDocument,
      toast,
    ],
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

    // Actions
    switchKit,
    switchPreset,
    importPreset,
    sharePreset,

    // Preset management
    saveCurrentPreset,
    isCurrentPresetCustom,
    canAddMorePresets,
  };
}

export { usePresetManager };
export type { UsePresetManagerResult };
