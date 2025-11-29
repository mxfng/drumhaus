import { useState } from "react";

import { ConfirmSelectPresetDialog } from "@/components/dialog/ConfirmSelectPresetDialog";
import { ExportDialog } from "@/components/dialog/ExportDialog";
import { SaveDialog } from "@/components/dialog/SaveDialog";
import { ShareDialog } from "@/components/dialog/ShareDialog";
import { useDrumhaus } from "@/components/DrumhausProvider";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import { usePresetManager } from "@/hooks/usePresetManager";
import { useDialogStore } from "@/stores/useDialogStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { type BusSubTab } from "./contextmenu/MobileBusContextMenu";
import { MobileContextMenu } from "./contextmenu/MobileContextMenu";
import type { InstrumentMode } from "./contextmenu/MobileInstrumentContextMenu";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileHeader } from "./MobileHeader";
import { MobileTabView, type TabType } from "./MobileTabView";
import { MobilePresetMenu } from "./preset/MobilePresetMenu";

const DrumhausMobile: React.FC = () => {
  // --- Context ---
  const { instrumentRuntimes, instrumentRuntimesVersion, loadPreset } =
    useDrumhaus();
  // State
  const [menuOpen, setMenuOpen] = useState(false); // Preset action menu
  const [activeTab, setActiveTab] = useState<TabType>("controls");
  const [instrumentMode, setInstrumentMode] =
    useState<InstrumentMode>("trigger");
  const [busSubTab, setBusSubTab] = useState<BusSubTab>("comp");

  // Dialog state
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const openDialog = useDialogStore((state) => state.openDialog);
  const presetToChange = useDialogStore(
    (state) => state.dialogData.presetToChange,
  );

  // Preset/Kit metadata
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);

  // Preset Manager
  const {
    kits,
    defaultPresets,
    customPresets,
    allPresets,
    switchKit,
    switchPreset,
    exportPreset,
    importPreset,
    sharePreset,
  } = usePresetManager({ loadPreset });

  // --- Mobile-specific UI hooks ---
  useScrollLock(true);

  // --- Handlers ---

  // Kit selection handler
  const handleKitChange = (kitId: string) => {
    switchKit(kitId);
    setMenuOpen(false);
  };

  // Preset selection handler
  const handlePresetChange = (presetId: string) => {
    switchPreset(presetId);
    setMenuOpen(false);
  };

  const handleConfirmPresetChange = () => {
    closeDialog();
    const preset = allPresets.find((p) => p.meta.id === presetToChange);
    if (preset) loadPreset(preset);
  };

  return (
    <div className="bg-surface flex h-dvh flex-col overflow-x-hidden overflow-y-hidden overscroll-none">
      {/* Header: Logo + Preset Info */}
      <MobileHeader
        onMenuOpen={() => setMenuOpen(true)}
        onLogoClick={() => openDialog("about")}
      />

      {/* Tabbed View: Instrument / Controls */}
      <MobileTabView
        instrumentRuntimes={instrumentRuntimes}
        instrumentRuntimesVersion={instrumentRuntimesVersion}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        instrumentMode={instrumentMode}
        busSubTab={busSubTab}
      />

      {/* Contextual Menu - changes based on active tab */}
      <MobileContextMenu
        activeTab={activeTab}
        instrumentMode={instrumentMode}
        onInstrumentModeChange={setInstrumentMode}
        busSubTab={busSubTab}
        onBusSubTabChange={setBusSubTab}
      />

      {/* Bottom Navigation */}
      <MobileBottomNav
        instrumentRuntimes={instrumentRuntimes}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onMenuOpen={() => setMenuOpen(true)}
      />

      {/* Preset Menu */}
      <MobilePresetMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        defaultPresets={defaultPresets}
        customPresets={customPresets}
        kits={kits}
        selectedPresetId={currentPresetMeta.id}
        selectedKitId={currentKitMeta.id}
        onPresetSelect={handlePresetChange}
        onKitSelect={handleKitChange}
        importPreset={importPreset}
      />

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
    </div>
  );
};

export default DrumhausMobile;
