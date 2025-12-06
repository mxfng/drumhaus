import { lazy, Suspense } from "react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { KitNavigator } from "@/features/kit/components/KitNavigator";
import { KitSelect } from "@/features/kit/components/KitSelect";
import { PresetActions } from "@/features/preset/components/PresetActions";
import { PresetSelect } from "@/features/preset/components/PresetSelect";
import { usePresetManager } from "@/features/preset/hooks/usePresetManager";
import { generateDuplicateName } from "@/features/preset/lib/helpers";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { useDialogStore } from "@/shared/store/useDialogStore";

const SaveAsDialog = lazy(() =>
  import("@/features/preset/dialogs/SaveAsDialog").then((module) => ({
    default: module.SaveAsDialog,
  })),
);

const ExportDialog = lazy(() =>
  import("@/features/preset/dialogs/ExportDialog").then((module) => ({
    default: module.ExportDialog,
  })),
);

const ShareDialog = lazy(() =>
  import("@/features/preset/dialogs/ShareDialog").then((module) => ({
    default: module.ShareDialog,
  })),
);

const RenamePresetDialog = lazy(() =>
  import("@/features/preset/dialogs/RenamePresetDialog").then((module) => ({
    default: module.RenamePresetDialog,
  })),
);

const DuplicatePresetDialog = lazy(() =>
  import("@/features/preset/dialogs/DuplicatePresetDialog").then((module) => ({
    default: module.DuplicatePresetDialog,
  })),
);

const DeleteConfirmDialog = lazy(() =>
  import("@/features/preset/dialogs/DeleteConfirmDialog").then((module) => ({
    default: module.DeleteConfirmDialog,
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
    saveCurrentPreset,
    sharePreset,
  } = usePresetManager({ loadPreset });

  // Store state
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);

  // Dialog state
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const openDialog = useDialogStore((state) => state.openDialog);
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const dialogData = useDialogStore((state) => state.dialogData);

  const handleKitChange = (value: string) => {
    switchKit(value);
  };

  const handlePresetChange = (value: string) => {
    switchPreset(value);
  };

  const handleConfirmPresetChange = () => {
    closeDialog();
    const preset = allPresets.find((p) => p.meta.id === dialogData.preset?.id);
    if (preset) loadPreset(preset);
  };

  // Preset management handlers
  const handleRenamePreset = (presetId: string, currentName: string) => {
    openDialog("renamePreset", {
      preset: { id: presetId, name: currentName },
    });
  };

  const handleDuplicatePreset = (presetId: string, currentName: string) => {
    const suggestedName = generateDuplicateName(currentName, customPresets);
    openDialog("duplicatePreset", {
      preset: { id: presetId, name: suggestedName },
    });
  };

  const handleDeletePreset = (presetId: string, presetName: string) => {
    openDialog("deletePresetConfirm", {
      preset: { id: presetId, name: presetName },
    });
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
      <div className="border-screen-foreground flex w-full flex-1 items-center gap-2 border-b text-sm">
        <div className="h-full w-1/6">
          <div className="bg-screen-foreground text-screen mr-1 flex h-full items-center px-1">
            preset
          </div>
        </div>
        <div className="flex-1">
          <PresetSelect
            selectedPresetId={currentPresetMeta.id}
            defaultPresets={defaultPresets}
            customPresets={customPresets}
            onSelect={handlePresetChange}
            onRenamePreset={handleRenamePreset}
            onDuplicatePreset={handleDuplicatePreset}
            onDeletePreset={handleDeletePreset}
          />
        </div>
        <div className="bg-screen-foreground h-full w-1/4">
          <PresetActions onOpenFromFile={importPreset} />
        </div>
      </div>

      {/* Kit Row: 1/6 label + fill selector + 1/4 navigator */}
      <div className="border-screen-foreground flex w-full flex-1 items-center gap-2 text-sm">
        <div className="h-full w-1/6">
          <div className="bg-screen-foreground text-screen mr-1 flex h-full items-center px-1">
            kit
          </div>
        </div>
        <div className="flex-1">
          <KitSelect
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
        <SaveAsDialog
          isOpen={activeDialog === "save"}
          onClose={closeDialog}
          onSave={saveCurrentPreset}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ExportDialog
          isOpen={activeDialog === "export"}
          onClose={closeDialog}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ShareDialog
          isOpen={activeDialog === "share"}
          onClose={closeDialog}
          onShare={sharePreset}
        />
      </Suspense>

      <Suspense fallback={null}>
        <RenamePresetDialog
          isOpen={activeDialog === "renamePreset"}
          onClose={closeDialog}
          presetId={dialogData.preset?.id || ""}
          currentName={dialogData.preset?.name || ""}
        />
      </Suspense>

      <Suspense fallback={null}>
        <DuplicatePresetDialog
          isOpen={activeDialog === "duplicatePreset"}
          onClose={closeDialog}
          presetId={dialogData.preset?.id || ""}
          suggestedName={dialogData.preset?.name || ""}
        />
      </Suspense>

      <Suspense fallback={null}>
        <DeleteConfirmDialog
          isOpen={activeDialog === "deletePresetConfirm"}
          onClose={closeDialog}
          presetId={dialogData.preset?.id || ""}
          presetName={dialogData.preset?.name || ""}
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
