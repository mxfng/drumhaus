import { usePresetManager } from "@/hooks/preset/usePresetManager";
import { useDrumhaus } from "@/providers/DrumhausProvider";
import { useDialogStore } from "@/stores/useDialogStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { ConfirmSelectPresetDialog } from "../../dialog/ConfirmSelectPresetDialog";
import { ExportDialog } from "../../dialog/ExportDialog";
import { SaveDialog } from "../../dialog/SaveDialog";
import { ShareDialog } from "../../dialog/ShareDialog";
import { KitSelector } from "./KitSelector";
import { PresetActions } from "./PresetActions";
import { PresetSelector } from "./PresetSelector";

export const PresetControl: React.FC = () => {
  const { loadPreset } = useDrumhaus();
  const {
    kits,
    defaultPresets,
    customPresets,
    allPresets,
    switchKit,
    switchPreset,
    importPreset,
    exportPreset,
    sharePreset,
  } = usePresetManager({ loadPreset });

  // Store state
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);

  // Dialog state
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const presetToChange = useDialogStore(
    (state) => state.dialogData.presetToChange,
  );

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

  return (
    <>
      <div className="flex h-full w-full items-center justify-center px-6">
        <div className="neu surface relative flex h-full w-full flex-col justify-between rounded-lg p-3">
          <PresetSelector
            selectedPresetId={currentPresetMeta.id}
            defaultPresets={defaultPresets}
            customPresets={customPresets}
            onSelect={handlePresetChange}
          />

          <KitSelector
            selectedKitId={currentKitMeta.id}
            kits={kits}
            onSelect={handleKitChange}
          />
          <PresetActions onOpenFromFile={importPreset} />
        </div>
      </div>

      <SaveDialog
        isOpen={activeDialog === "save"}
        onClose={closeDialog}
        onSave={exportPreset}
      />

      <ShareDialog
        isOpen={activeDialog === "share"}
        onClose={closeDialog}
        onShare={sharePreset}
      />

      <ExportDialog isOpen={activeDialog === "export"} onClose={closeDialog} />

      <ConfirmSelectPresetDialog
        isOpen={activeDialog === "presetChange"}
        onClose={closeDialog}
        onSelect={handleConfirmPresetChange}
      />
    </>
  );
};
