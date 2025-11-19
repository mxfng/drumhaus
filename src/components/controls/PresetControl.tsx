"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Center } from "@chakra-ui/react";

import * as kits from "@/lib/kit";
import * as presets from "@/lib/preset";
import { getCurrentPreset } from "@/lib/preset/helpers";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useModalStore } from "@/stores/useModalStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { KitFileV1 } from "@/types/instrument";
import type { Meta } from "@/types/meta";
import type { PresetFileV1 } from "@/types/preset";
import { ConfirmSelectPresetModal } from "../modal/ConfirmSelectPresetModal";
import { ErrorModal } from "../modal/ErrorModal";
import { ResetModal } from "../modal/ResetModal";
import { SaveModal } from "../modal/SaveModal";
import { SharedModal, SharingModal } from "../modal/ShareModals";
import { KitSelector } from "./preset/KitSelector";
import { PresetActions } from "./preset/PresetActions";
import { PresetSelector } from "./preset/PresetSelector";

type PresetControlProps = {
  createPresetFn: (preset: PresetFileV1) => void;
  togglePlay: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PresetControl: React.FC<PresetControlProps> = ({
  createPresetFn,
  togglePlay,
  isLoading,
  setIsLoading,
}) => {
  // Store state
  const isPlaying = useTransportStore((state) => state.isPlaying);
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

  // Modal state
  const {
    isSaveModalOpen,
    isSharingModalOpen,
    isSharedModalOpen,
    isResetModalOpen,
    isErrorModalShowing,
    isPresetChangeModalOpen,
    shareableLink,
    presetToChange,
    closeSaveModal,
    closeSharingModal,
    closeSharedModal,
    closeResetModal,
    closeErrorModal,
    closePresetChangeModal,
    openSharedModal,
    openErrorModal,
    openPresetChangeModal,
    openSharePrompt,
    closeSharePrompt,
  } = useModalStore();

  const modalCloseRef = useRef(null);

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
  const allPresets = useMemo(
    () => [...DEFAULT_PRESETS, ...customPresets],
    [DEFAULT_PRESETS, customPresets],
  );

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  /**
   * Switch to a different kit. Simple: update instruments + kit metadata.
   */
  const switchKit = (kitId: string) => {
    const kit = KITS.find((k) => k.meta.id === kitId);
    if (!kit) {
      console.error(`Kit ${kitId} not found`);
      return;
    }

    if (isPlaying) togglePlay();
    setAllInstruments(kit.instruments);
    setKitMeta(kit.meta);
  };

  /**
   * Load a preset into the app. Updates all state.
   */
  const loadPreset = (preset: PresetFileV1) => {
    if (isPlaying) togglePlay();

    // Add to custom presets if not already there
    if (!allPresets.find((p) => p.meta.id === preset.meta.id)) {
      setCustomPresets((prev) => [...prev, preset]);
    }

    // Activate the preset (updates instruments, meta, etc.)
    createPresetFn(preset);
  };

  /**
   * Switch to a preset by ID. Checks for unsaved changes first.
   */
  const switchPreset = (presetId: string) => {
    if (hasUnsavedChanges()) {
      openPresetChangeModal(presetId);
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
  const exportPreset = (name: string) => {
    const now = new Date().toISOString();
    const meta: Meta = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
    };

    const preset = getCurrentPreset(meta, currentKitMeta);

    // Download file
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
    if (isPlaying) togglePlay();

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
          openErrorModal();
        }
      };
      reader.onerror = () => openErrorModal();
      reader.readAsText(file);
    };
    input.click();
  };

  // ============================================================================
  // SHARING
  // ============================================================================

  /**
   * Generate a shareable URL for the current preset
   */
  const sharePreset = async (name: string) => {
    try {
      const now = new Date().toISOString();
      const meta: Meta = {
        id: crypto.randomUUID(),
        name,
        createdAt: now,
        updatedAt: now,
      };

      const preset = getCurrentPreset(meta, currentKitMeta);
      const { shareablePresetToUrl } = await import("@/lib/serialization");
      const urlParam = shareablePresetToUrl(preset);
      const shareUrl = `${window.location.origin}/?p=${urlParam}`;

      openSharedModal(shareUrl);
    } catch (error) {
      console.error("Failed to share preset:", error);
      openErrorModal();
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleKitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchKit(e.target.value);
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    switchPreset(e.target.value);
  };

  const handleConfirmPresetChange = () => {
    closePresetChangeModal();
    const preset = allPresets.find((p) => p.meta.id === presetToChange);
    if (preset) loadPreset(preset);
  };

  const handleReset = () => {
    closeResetModal();
    loadPreset(presets.init());
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Add current preset to custom presets if loaded from URL
  useEffect(() => {
    if (!allPresets.find((p) => p.meta.id === currentPresetMeta.id)) {
      const preset = getCurrentPreset(currentPresetMeta, currentKitMeta);
      setCustomPresets((prev) => [...prev, preset]);
    }
  }, [currentPresetMeta, currentKitMeta, allPresets]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <Center h="100%">
        <Box
          w="100%"
          h="195px"
          className="neumorphicExtraTall"
          borderRadius="8px"
          pt={2}
          pb={1}
          px={3}
          position="relative"
          ref={modalCloseRef}
        >
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
        </Box>
      </Center>

      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={closeSaveModal}
        onSave={exportPreset}
        modalCloseRef={modalCloseRef}
      />

      <SharingModal
        isOpen={isSharingModalOpen}
        onClose={closeSharingModal}
        onShare={sharePreset}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        modalCloseRef={modalCloseRef}
      />

      <SharedModal
        isOpen={isSharedModalOpen}
        onClose={closeSharedModal}
        shareableLink={shareableLink}
        modalCloseRef={modalCloseRef}
      />

      <ResetModal
        isOpen={isResetModalOpen}
        onClose={closeResetModal}
        onReset={handleReset}
        modalCloseRef={modalCloseRef}
      />

      <ErrorModal isOpen={isErrorModalShowing} onClose={closeErrorModal} />

      <ConfirmSelectPresetModal
        isOpen={isPresetChangeModalOpen}
        onClose={closePresetChangeModal}
        onSelect={handleConfirmPresetChange}
        modalCloseRef={modalCloseRef}
      />
    </>
  );
};
