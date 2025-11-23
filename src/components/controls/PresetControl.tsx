import { useCallback, useEffect, useMemo, useState } from "react";
import { FaFolder, FaFolderOpen, FaUnlink } from "react-icons/fa";

import { Tooltip, useToast } from "@/components/ui";
import * as kits from "@/lib/kit";
import * as presets from "@/lib/preset";
import { getCurrentPreset } from "@/lib/preset/helpers";
import { isFileSystemAccessSupported } from "@/lib/storage/indexedDb";
import { useDialogStore } from "@/stores/useDialogStore";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePresetFolderStore } from "@/stores/usePresetFolderStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import type { KitFileV1 } from "@/types/instrument";
import type { Meta } from "@/types/meta";
import type { PresetFileV1 } from "@/types/preset";
import { ConfirmSelectPresetDialog } from "../dialog/ConfirmSelectPresetDialog";
import { ResetDialog } from "../dialog/ResetDialog";
import { SaveDialog } from "../dialog/SaveDialog";
import { ShareDialog } from "../dialog/ShareDialog";
import { KitSelector } from "./preset/KitSelector";
import { PresetActions } from "./preset/PresetActions";
import { PresetSelector } from "./preset/PresetSelector";

type PresetControlProps = {
  loadPreset: (preset: PresetFileV1) => void;
};

const MAX_PRESET_NAME_LENGTH = 20;

const normalizePresetName = (name: string): string => {
  const trimmed = name.trim();
  const limited = trimmed.slice(0, MAX_PRESET_NAME_LENGTH);
  return limited || "Untitled";
};

const toPresetSlug = (name: string): string => {
  const base = normalizePresetName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || "preset";
};

export const PresetControl: React.FC<PresetControlProps> = ({
  loadPreset: loadPresetFromParent,
}) => {
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

  // Preset folder state
  const folderName = usePresetFolderStore((state) => state.folderName);
  const folderStatus = usePresetFolderStore((state) => state.status);
  const userPresets = usePresetFolderStore((state) => state.userPresets);
  const selectFolder = usePresetFolderStore((state) => state.selectFolder);
  const disconnectFolder = usePresetFolderStore(
    (state) => state.disconnectFolder,
  );
  const saveToFolder = usePresetFolderStore((state) => state.saveToFolder);
  const getFileHandle = usePresetFolderStore((state) => state.getFileHandle);
  const updateInFolder = usePresetFolderStore((state) => state.updateInFolder);

  // Dialog state
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const presetToChange = useDialogStore(
    (state) => state.dialogData.presetToChange,
  );

  const { toast } = useToast();

  // Available kits and presets
  const KITS: KitFileV1[] = useMemo(
    () => [
      kits.drumhaus(),
      kits.organic(),
      kits.funk(),
      kits.rnb(),
      kits.trap(),
      kits.eighties(),
      kits.tech_house(),
      kits.techno(),
      kits.indie(),
      kits.jungle(),
    ],
    [],
  );

  const DEFAULT_PRESETS: PresetFileV1[] = useMemo(
    () => [
      presets.init(),
      presets.welcomeToTheHaus(),
      presets.aDrumCalledHaus(),
      presets.amsterdam(),
      presets.polaroidBounce(),
      presets.purpleHaus(),
      presets.richKids(),
      presets.slimeTime(),
      presets.sunflower(),
      presets.superDreamHaus(),
      presets.togetherAgain(),
    ],
    [],
  );

  // Track custom presets (loaded from file or URL)
  const [customPresets, setCustomPresets] = useState<PresetFileV1[]>([]);

  // Combine all presets: defaults + user folder + custom (loaded from file/URL)
  const allPresets = useMemo(() => {
    const folderPresets = userPresets.map((p) => p.preset);
    return [...DEFAULT_PRESETS, ...folderPresets, ...customPresets];
  }, [DEFAULT_PRESETS, userPresets, customPresets]);

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  /**
   * Add a preset to custom presets if it's not already in DEFAULT_PRESETS, userPresets, or customPresets.
   * This prevents duplicates when loading presets from URLs or files.
   */
  const addToCustomPresetsIfNeeded = useCallback(
    (preset: PresetFileV1) => {
      const isInDefaults = DEFAULT_PRESETS.some(
        (p) => p.meta.id === preset.meta.id,
      );
      const isInFolder = userPresets.some(
        (p) => p.preset.meta.id === preset.meta.id,
      );
      if (!isInDefaults && !isInFolder) {
        setCustomPresets((prev) => {
          const isInCustom = prev.some((p) => p.meta.id === preset.meta.id);
          if (!isInCustom) {
            return [...prev, preset];
          }
          return prev;
        });
      }
    },
    [DEFAULT_PRESETS, userPresets],
  );

  /**
   * Switch to a different kit. Simple: update instruments + kit metadata.
   */
  const switchKit = (kitId: string) => {
    const kit = KITS.find((k) => k.meta.id === kitId);
    if (!kit) {
      console.error(`Kit ${kitId} not found`);
      return;
    }

    setAllInstruments(kit.instruments);
    setKitMeta(kit.meta);
  };

  /**
   * Load a preset into the app. Updates all state.
   */
  const loadPreset = (preset: PresetFileV1) => {
    // Add to custom presets if not already there
    addToCustomPresetsIfNeeded(preset);

    // Activate the preset via parent (updates all stores, stops playback)
    loadPresetFromParent(preset);
  };

  /**
   * Switch to a preset by ID. Checks for unsaved changes first.
   */
  const switchPreset = (presetId: string) => {
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
  };

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  /**
   * Export current state as a .dh file
   */
  const exportPreset = async (name: string) => {
    const normalizedName = normalizePresetName(name);

    const now = new Date().toISOString();
    const meta: Meta = {
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: now,
      updatedAt: now,
    };

    const preset = getCurrentPreset(meta, currentKitMeta);

    // If folder is linked, save there
    if (folderStatus === "connected") {
      try {
        // Check if we're updating an existing preset from the folder
        const existingHandle = getFileHandle(currentPresetMeta.id);

        if (existingHandle && currentPresetMeta.name === normalizedName) {
          // Update existing file
          const updatePreset = getCurrentPreset(
            { ...currentPresetMeta, updatedAt: now },
            currentKitMeta,
          );
          await updateInFolder(updatePreset, existingHandle);
          markPresetClean(updatePreset);

          toast({
            title: `Saved "${normalizedName}"`,
            description: "Updated in linked folder",
          });
        } else {
          // Save as new file
          await saveToFolder(preset);
          markPresetClean(preset);
          loadPreset(preset);

          toast({
            title: `Saved "${normalizedName}"`,
            description: "Added to linked folder",
          });
        }
        return;
      } catch (error) {
        console.error("Failed to save to folder:", error);
        toast({
          title: "Couldn't save to folder",
          description: "Falling back to download",
          status: "error",
        });
        // Fall through to download
      }
    }

    // Download file (default behavior)
    const json = JSON.stringify(preset, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}.dh`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Update state
    markPresetClean(preset);
    loadPreset(preset);
  };

  /**
   * Import a preset from a .dh file
   */
  const importPreset = () => {
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

          const preset: PresetFileV1 = JSON.parse(result);
          loadPreset(preset);
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
  };

  // ============================================================================
  // SHARING
  // ============================================================================

  /**
   * Get the default preset name for save/share dialogs
   */
  const getDefaultPresetName = (): string => {
    return currentPresetMeta.name;
  };

  /**
   * Generate a shareable URL for the current preset
   */
  const sharePreset = async (name: string): Promise<string> => {
    const normalizedName = normalizePresetName(name);
    const slug = toPresetSlug(normalizedName);

    const now = new Date().toISOString();
    const meta: Meta = {
      id: crypto.randomUUID(),
      name: normalizedName,
      createdAt: now,
      updatedAt: now,
    };

    const preset = getCurrentPreset(meta, currentKitMeta);
    const { shareablePresetToUrl } = await import("@/lib/serialization");
    const urlParam = shareablePresetToUrl(preset);
    const shareUrl = `${window.location.origin}/?p=${urlParam}&n=${encodeURIComponent(slug)}`;

    return shareUrl;
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleKitChange = (value: string) => {
    switchKit(value);
  };

  const handlePresetChange = (value: string) => {
    switchPreset(value);
  };

  const handleConfirmPresetChange = () => {
    closeDialog();
    const preset = allPresets.find((p) => p.meta.id === presetToChange);
    if (preset) loadPreset(preset);
  };

  const handleReset = () => {
    closeDialog();
    loadPreset(presets.init());
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Add current preset to custom presets if loaded from URL
  useEffect(() => {
    const preset = getCurrentPreset(currentPresetMeta, currentKitMeta);
    addToCustomPresetsIfNeeded(preset);
  }, [currentPresetMeta, currentKitMeta, addToCustomPresetsIfNeeded]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="mx-4 flex h-full items-center justify-center">
        <div className="neu surface relative h-[190px] w-[332px] rounded-lg px-3">
          <PresetSelector
            selectedPresetId={currentPresetMeta.id}
            presets={allPresets}
            onSelect={handlePresetChange}
          />

          <KitSelector
            selectedKitId={currentKitMeta.id}
            kits={KITS}
            onSelect={handleKitChange}
          />
          <PresetActions onOpenFromFile={importPreset} />

          {/* Folder link indicator */}
          {isFileSystemAccessSupported() && (
            <div className="mt-2 flex items-center justify-between text-xs">
              {folderStatus === "connected" ? (
                <>
                  <div className="text-muted-foreground flex items-center gap-1.5 truncate">
                    <FaFolder className="text-accent h-3 w-3 shrink-0" />
                    <span className="truncate" title={folderName || undefined}>
                      {folderName}
                    </span>
                    <span className="text-muted-foreground/60">
                      ({userPresets.length})
                    </span>
                  </div>
                  <Tooltip content="Unlink folder" delayDuration={500}>
                    <button
                      onClick={disconnectFolder}
                      className="text-muted-foreground hover:text-foreground h-5 w-5 transition-colors"
                    >
                      <FaUnlink className="h-3 w-3" />
                    </button>
                  </Tooltip>
                </>
              ) : folderStatus === "permission_required" ? (
                <button
                  onClick={selectFolder}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <FaFolderOpen className="h-3 w-3" />
                  <span>Grant folder access</span>
                </button>
              ) : (
                <button
                  onClick={selectFolder}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                >
                  <FaFolderOpen className="h-3 w-3" />
                  <span>Link preset folder</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <SaveDialog
        isOpen={activeDialog === "save"}
        onClose={closeDialog}
        onSave={exportPreset}
        defaultName={getDefaultPresetName()}
      />

      <ShareDialog
        isOpen={activeDialog === "share"}
        onClose={closeDialog}
        onShare={sharePreset}
        defaultName={getDefaultPresetName()}
      />

      <ResetDialog
        isOpen={activeDialog === "reset"}
        onClose={closeDialog}
        onReset={handleReset}
      />

      <ConfirmSelectPresetDialog
        isOpen={activeDialog === "presetChange"}
        onClose={closeDialog}
        onSelect={handleConfirmPresetChange}
      />
    </>
  );
};
