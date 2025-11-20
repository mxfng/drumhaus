"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Center, useToast } from "@chakra-ui/react";

import * as kits from "@/lib/kit";
import * as presets from "@/lib/preset";
import { getCurrentPreset } from "@/lib/preset/helpers";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useModalStore } from "@/stores/useModalStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import type { KitFileV1 } from "@/types/instrument";
import type { Meta } from "@/types/meta";
import type { PresetFileV1 } from "@/types/preset";
import { ConfirmSelectPresetModal } from "../modal/ConfirmSelectPresetModal";
import { ResetModal } from "../modal/ResetModal";
import { SaveModal } from "../modal/SaveModal";
import { SharedModal, SharingModal } from "../modal/ShareModals";
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

  // Modal state
  const {
    isSaveModalOpen,
    isSharingModalOpen,
    isSharedModalOpen,
    isResetModalOpen,
    isPresetChangeModalOpen,
    shareableLink,
    presetToChange,
    closeSaveModal,
    closeSharingModal,
    closeSharedModal,
    closeResetModal,
    closePresetChangeModal,
    openSharedModal,
    openPresetChangeModal,
  } = useModalStore();

  const toast = useToast();

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

    setAllInstruments(kit.instruments);
    setKitMeta(kit.meta);
  };

  /**
   * Load a preset into the app. Updates all state.
   */
  const loadPreset = (preset: PresetFileV1) => {
    // Add to custom presets if not already there
    if (!allPresets.find((p) => p.meta.id === preset.meta.id)) {
      setCustomPresets((prev) => [...prev, preset]);
    }

    // Activate the preset via parent (updates all stores, stops playback)
    loadPresetFromParent(preset);
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
    const normalizedName = normalizePresetName(name);

    const now = new Date().toISOString();
    const meta: Meta = {
      id: crypto.randomUUID(),
      name: normalizedName,
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
            title: "Something went wrong.",
            description:
              error instanceof Error
                ? error.message
                : "Failed to import preset",
            status: "error",
            duration: 8000,
            isClosable: true,
            position: "top",
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: "Something went wrong.",
          description: "Failed to import preset",
          status: "error",
          duration: 8000,
          isClosable: true,
          position: "top",
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
   * Generate a unique copy-style name for the current preset
   */
  const generateCopyName = (baseName: string): string => {
    const copyName = `${baseName} copy`;

    // Check if base copy name exists
    if (!allPresets.find((p) => p.meta.name === copyName)) {
      return copyName;
    }

    // Try numbered copies (copy 1, copy 2, etc.)
    let counter = 1;
    while (allPresets.find((p) => p.meta.name === `${copyName} ${counter}`)) {
      counter++;
    }

    return `${copyName} ${counter}`;
  };

  /**
   * Generate a shareable URL for the current preset
   */
  const sharePreset = async (name: string) => {
    try {
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

      openSharedModal(shareUrl);
    } catch (error) {
      console.error("Failed to share preset:", error);
      toast({
        title: "Something went wrong.",
        description:
          error instanceof Error ? error.message : "Failed to share preset",
        status: "error",
        duration: 8000,
        isClosable: true,
        position: "top",
      });
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
        defaultName={currentPresetMeta.name}
      />

      <SharingModal
        isOpen={isSharingModalOpen}
        onClose={closeSharingModal}
        onShare={sharePreset}
        modalCloseRef={modalCloseRef}
        defaultName={generateCopyName(currentPresetMeta.name)}
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

      <ConfirmSelectPresetModal
        isOpen={isPresetChangeModalOpen}
        onClose={closePresetChangeModal}
        onSelect={handleConfirmPresetChange}
        modalCloseRef={modalCloseRef}
      />
    </>
  );
};
