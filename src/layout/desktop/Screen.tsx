import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { KitNavigator } from "@/features/kit/components/KitNavigator";
import { KitSelector } from "@/features/kit/components/KitSelector";
import { PresetActions } from "@/features/preset/components/PresetActions";
import { PresetSelector } from "@/features/preset/components/PresetSelector";
import { ConfirmSelectPresetDialog } from "@/features/preset/dialogs/ConfirmSelectPresetDialog";
import { ExportDialog } from "@/features/preset/dialogs/ExportDialog";
import { SaveDialog } from "@/features/preset/dialogs/SaveDialog";
import { ShareDialog } from "@/features/preset/dialogs/ShareDialog";
import { usePresetManager } from "@/features/preset/hooks/usePresetManager";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { ScreenTransportDisplay } from "@/layout/desktop/ScreenTransportDisplay";
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

  const handlePreviousKit = () => {
    const currentIndex = kits.findIndex(
      (kit) => kit.meta.id === currentKitMeta.id,
    );
    if (currentIndex > 0) {
      switchKit(kits[currentIndex - 1].meta.id);
    } else {
      // Wrap to last kit
      switchKit(kits[kits.length - 1].meta.id);
    }
  };

  const handleNextKit = () => {
    const currentIndex = kits.findIndex(
      (kit) => kit.meta.id === currentKitMeta.id,
    );
    if (currentIndex < kits.length - 1) {
      switchKit(kits[currentIndex + 1].meta.id);
    } else {
      // Wrap to first kit
      switchKit(kits[0].meta.id);
    }
  };

  return (
    <>
      {/* Screen Display */}
      <div className="bg-instrument/50 border-border text-foreground-emphasis col-span-4 overflow-clip rounded-2xl border">
        <div className="grid h-full w-full grid-cols-2 rounded-2xl opacity-30">
          {/* Left Column - Equal heights */}
          <div className="border-foreground-emphasis flex h-full flex-col border-r">
            {/* Preset Row: 1/6 label + fill selector + 1/6 actions */}
            <div className="border-foreground-emphasis flex w-full flex-1 items-center gap-2 border-b pl-2 text-sm">
              <div className="w-1/6">
                <mark className="bg-foreground-emphasis text-instrument rounded px-1">
                  preset
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

            {/* Kit Row: 1/6 label + fill selector + 1/4 navigator */}
            <div className="border-foreground-emphasis flex w-full flex-1 items-center gap-2 pl-2 text-sm">
              <div className="w-1/6">
                <mark className="bg-foreground-emphasis text-instrument rounded px-1">
                  kit
                </mark>
              </div>
              <div className="flex-1">
                <KitSelector
                  selectedKitId={currentKitMeta.id}
                  kits={kits}
                  onSelect={handleKitChange}
                />
              </div>
              <div className="bg-foreground-emphasis h-full w-1/4">
                <KitNavigator
                  onPrevious={handlePreviousKit}
                  onNext={handleNextKit}
                />
              </div>
            </div>
          </div>

          {/* Right Column - 2/3 and 1/3 split */}
          <div className="flex h-full flex-col">
            <div className="border-foreground-emphasis relative h-2/3 min-h-0">
              <div className="absolute inset-0 pl-3">
                <FrequencyAnalyzer />
              </div>
            </div>
            <div className="h-1/3">
              <ScreenTransportDisplay />
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
