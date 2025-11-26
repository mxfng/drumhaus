import { useEffect, useMemo, useState } from "react";

import { AboutDialog } from "@/components/dialog/AboutDialog";
import { ConfirmSelectPresetDialog } from "@/components/dialog/ConfirmSelectPresetDialog";
import { ExportDialog } from "@/components/dialog/ExportDialog";
import { SaveDialog } from "@/components/dialog/SaveDialog";
import { ShareDialog } from "@/components/dialog/ShareDialog";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { usePresetLoading } from "@/hooks/usePresetLoading";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import * as kits from "@/lib/kit";
import * as presets from "@/lib/preset";
import { useDialogStore } from "@/stores/useDialogStore";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { PresetFileV1 } from "@/types/preset";
import { MobileHeader } from "./MobileHeader";
import { MobileInstrumentSelector } from "./MobileInstrumentSelector";
import { MobilePlayButton } from "./MobilePlayButton";
import { MobilePresetMenu } from "./MobilePresetMenu";
import { MobileTabView, type TabType } from "./MobileTabView";

const DrumhausMobile: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("controls");
  const customPresets: PresetFileV1[] = useMemo(() => [], []);

  // Service Worker
  useServiceWorker();

  // Audio Engine
  const { instrumentRuntimes, instrumentRuntimesVersion } = useAudioEngine();

  // Preset Loading
  const { loadPreset } = usePresetLoading({ instrumentRuntimes });

  // Dialog state
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const openDialog = useDialogStore((state) => state.openDialog);
  const presetToChange = useDialogStore(
    (state) => state.dialogData.presetToChange,
  );

  // Preset/Kit state
  const setAllInstruments = useInstrumentsStore(
    (state) => state.setAllInstruments,
  );
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);
  const setKitMeta = usePresetMetaStore((state) => state.setKitMeta);
  const hasUnsavedChanges = usePresetMetaStore(
    (state) => state.hasUnsavedChanges,
  );

  useScrollLock(true);

  // Available kits and presets
  const KITS = useMemo(
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

  const DEFAULT_PRESETS = useMemo(
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

  const allPresets = useMemo(
    () => [...DEFAULT_PRESETS, ...customPresets],
    [DEFAULT_PRESETS, customPresets],
  );

  // Kit selection handler
  const handleKitChange = (kitId: string) => {
    const kit = KITS.find((k) => k.meta.id === kitId);
    if (!kit) return;

    setAllInstruments(kit.instruments);
    setKitMeta(kit.meta);
    setMenuOpen(false);
  };

  // Preset selection handler
  const handlePresetChange = (presetId: string) => {
    if (hasUnsavedChanges()) {
      openDialog("presetChange", { presetToChange: presetId });
      setMenuOpen(false);
      return;
    }

    const preset = allPresets.find((p) => p.meta.id === presetId);
    if (preset) {
      loadPreset(preset);
      setMenuOpen(false);
    }
  };

  const handleConfirmPresetChange = () => {
    closeDialog();
    const preset = allPresets.find((p) => p.meta.id === presetToChange);
    if (preset) loadPreset(preset);
  };

  // Remove initial loader
  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (!loader) return;

    loader.classList.add("initial-loader--hidden");

    const timeout = window.setTimeout(() => {
      requestAnimationFrame(() => {
        loader.remove();
      });
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

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
      <MobilePlayButton
        instrumentRuntimes={instrumentRuntimes.current}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPresetMenu={() => setMenuOpen(true)}
      />

      {/* Preset Menu */}
      <MobilePresetMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        defaultPresets={DEFAULT_PRESETS}
        customPresets={customPresets}
        kits={KITS}
        selectedPresetId={currentPresetMeta.id}
        selectedKitId={currentKitMeta.id}
        onPresetSelect={handlePresetChange}
        onKitSelect={handleKitChange}
      />

      {/* Dialogs */}
      <AboutDialog isOpen={activeDialog === "about"} onClose={closeDialog} />
      <SaveDialog
        isOpen={activeDialog === "save"}
        onClose={closeDialog}
        onSave={() => {}}
      />
      <ShareDialog
        isOpen={activeDialog === "share"}
        onClose={closeDialog}
        onShare={async () => ""}
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
