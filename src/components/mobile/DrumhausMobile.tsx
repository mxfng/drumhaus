import { useState } from "react";

import { AboutDialog } from "@/components/dialog/AboutDialog";
import { ConfirmSelectPresetDialog } from "@/components/dialog/ConfirmSelectPresetDialog";
import { ExportDialog } from "@/components/dialog/ExportDialog";
import { SaveDialog } from "@/components/dialog/SaveDialog";
import { ShareDialog } from "@/components/dialog/ShareDialog";
import { useRemoveInitialLoader } from "@/hooks/ui/useRemoveInitialLoader";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { usePresetLoading } from "@/hooks/usePresetLoading";
import { usePresetManager } from "@/hooks/usePresetManager";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useDialogStore } from "@/stores/useDialogStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileHeader } from "./MobileHeader";
import { MobileInstrumentSelector } from "./MobileInstrumentSelector";
import { MobilePresetMenu } from "./MobilePresetMenu";
import { MobileTabView, type TabType } from "./MobileTabView";

const DrumhausMobile: React.FC = () => {
  // State
  const [menuOpen, setMenuOpen] = useState(false); // Preset action menu
  const [activeTab, setActiveTab] = useState<TabType>("controls");

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

  // Service Worker for caching
  useServiceWorker();

  // Audio Engine
  const { instrumentRuntimes, instrumentRuntimesVersion } = useAudioEngine();

  // Preset Loading
  const { loadPreset } = usePresetLoading({ instrumentRuntimes });

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

  // --- Misc UI hooks ---
  useScrollLock(true);

  // Since this is the root layout we need to remove the initial loader
  useRemoveInitialLoader();

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
        instrumentRuntimes={instrumentRuntimes.current}
        instrumentRuntimesVersion={instrumentRuntimesVersion}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Instrument Selector */}
      <MobileInstrumentSelector />

      {/* Play Button */}
      <MobileBottomNav
        instrumentRuntimes={instrumentRuntimes.current}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
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
      <AboutDialog isOpen={activeDialog === "about"} onClose={closeDialog} />
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
