import { lazy, Suspense } from "react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { KitNavigator } from "@/features/kit/components/KitNavigator";
import { KitSelector } from "@/features/kit/components/KitSelector";
import { PresetActions } from "@/features/preset/components/PresetActions";
import { PresetSelector } from "@/features/preset/components/PresetSelector";
import { usePresetManager } from "@/features/preset/hooks/usePresetManager";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { useDialogStore } from "@/shared/store/useDialogStore";

const SaveDialog = lazy(() =>
  import("@/features/preset/dialogs/SaveDialog").then((module) => ({
    default: module.SaveDialog,
  })),
);

const ExportDialog = lazy(() =>
  import("@/features/preset/dialogs/ExportDialog").then((module) => ({
    default: module.ExportDialog,
  })),
);

const ConfirmSelectPresetDialog = lazy(() =>
  import("@/features/preset/dialogs/ConfirmSelectPresetDialog").then(
    (module) => ({
      default: module.ConfirmSelectPresetDialog,
    }),
  ),
);

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
      {/* Preset Row: 1/6 label + fill selector + 1/6 actions */}
      <div className="border-screen-foreground flex w-full flex-1 items-center gap-2 border-b pl-2 text-sm">
        <div className="w-1/6">
          <mark className="bg-screen-foreground text-screen rounded px-1">
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
        <div className="bg-screen-foreground h-full w-1/4">
          <PresetActions onOpenFromFile={importPreset} />
        </div>
      </div>

      {/* Kit Row: 1/6 label + fill selector + 1/4 navigator */}
      <div className="border-screen-foreground flex w-full flex-1 items-center gap-2 pl-2 text-sm">
        <div className="w-1/6">
          <mark className="bg-screen-foreground text-screen rounded px-1">
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
        <div className="bg-screen-foreground h-full w-1/4">
          <KitNavigator onPrevious={handlePreviousKit} onNext={handleNextKit} />
        </div>
      </div>

      <Suspense fallback={null}>
        <SaveDialog
          isOpen={activeDialog === "save"}
          onClose={closeDialog}
          onSave={exportPreset}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ExportDialog
          isOpen={activeDialog === "export"}
          onClose={closeDialog}
          onShare={sharePreset}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ConfirmSelectPresetDialog
          isOpen={activeDialog === "presetChange"}
          onClose={closeDialog}
          onSelect={handleConfirmPresetChange}
        />
      </Suspense>
    </>
  );
};
