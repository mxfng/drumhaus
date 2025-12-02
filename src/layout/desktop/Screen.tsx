import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { KitSelector } from "@/features/kit/components/KitSelector";
import { PresetActions } from "@/features/preset/components/PresetActions";
import { PresetSelector } from "@/features/preset/components/PresetSelector";
import { ConfirmSelectPresetDialog } from "@/features/preset/dialogs/ConfirmSelectPresetDialog";
import { ExportDialog } from "@/features/preset/dialogs/ExportDialog";
import { SaveDialog } from "@/features/preset/dialogs/SaveDialog";
import { ShareDialog } from "@/features/preset/dialogs/ShareDialog";
import { usePresetManager } from "@/features/preset/hooks/usePresetManager";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import FrequencyAnalyzer from "@/shared/components/FrequencyAnalyzer";
import { useDialogStore } from "@/shared/store/useDialogStore";

export const Screen: React.FC = () => {
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
      {/* Screen Display */}
      <div className="bg-instrument/50 border-border font-pixel text-foreground-emphasis col-span-4 overflow-hidden rounded-2xl border">
        <div className="grid h-full w-full grid-cols-2 rounded-2xl opacity-30">
          {/* Left Column - Equal heights */}
          <div className="border-foreground-emphasis flex h-full flex-col border-r">
            {/* Preset Row: 1/6 label + fill selector + 1/6 actions */}
            <div className="border-foreground-emphasis flex w-full flex-1 items-center gap-2 border-b pl-2 text-sm">
              <div className="w-1/6">
                <mark className="bg-foreground-emphasis text-instrument rounded px-1">
                  PRESET
                </mark>
              </div>
              <div className="flex-1">
                <PresetSelector
                  selectedPresetId={currentPresetMeta.id}
                  defaultPresets={defaultPresets}
                  customPresets={customPresets}
                  onSelect={handlePresetChange}
                />
              </div>
              <div className="bg-foreground-emphasis h-full w-1/4">
                <PresetActions onOpenFromFile={importPreset} />
              </div>
            </div>

            {/* Kit Row: 1/6 label + fill selector + 1/6 space */}
            <div className="border-foreground-emphasis flex w-full flex-1 items-center gap-2 pl-2 text-sm">
              <div className="w-1/6">
                <mark className="bg-foreground-emphasis text-instrument rounded px-1">
                  KIT
                </mark>
              </div>
              <div className="flex-1">
                <KitSelector
                  selectedKitId={currentKitMeta.id}
                  kits={kits}
                  onSelect={handleKitChange}
                />
              </div>
              <div className="w-1/6"></div>
            </div>
          </div>

          {/* Right Column - 2/3 and 1/3 split */}
          <div className="flex h-full flex-col">
            <div className="border-foreground-emphasis relative h-2/3 min-h-0 border-b">
              <div className="absolute inset-0">
                <FrequencyAnalyzer />
              </div>
            </div>
            <div className="bg-foreground-emphasis text-instrument flex h-1/3 items-center px-2 text-sm">
              Hello
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
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
