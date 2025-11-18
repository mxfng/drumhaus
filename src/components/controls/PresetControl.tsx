"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Center } from "@chakra-ui/react";

import * as kits from "@/lib/kit";
import { init } from "@/lib/preset/bin/ts/init";
import { welcome_to_the_haus } from "@/lib/preset/bin/ts/welcome_to_the_haus";
import { getCurrentPreset } from "@/lib/preset/helpers";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useModalStore } from "@/stores/useModalStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { KitFileV1 } from "@/types/instrument";
import type { Meta } from "@/types/meta";
import type { PresetFileV1 } from "@/types/preset";
import { ErrorModal } from "../modal/ErrorModal";
import { PresetChangeModal } from "../modal/PresetChangeModal";
import { ResetModal } from "../modal/ResetModal";
import { SaveModal } from "../modal/SaveModal";
import { SharedModal, SharingModal } from "../modal/ShareModals";
import { KitSelector } from "./preset/KitSelector";
import { PresetActions } from "./preset/PresetActions";
import { PresetSelector } from "./preset/PresetSelector";

type PresetControlProps = {
  loadPreset: (preset: PresetFileV1) => void;
  togglePlay: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PresetControl: React.FC<PresetControlProps> = ({
  loadPreset,
  togglePlay,
  isLoading,
  setIsLoading,
}) => {
  // Subscribe to stores for UI updates
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const setAllInstruments = useInstrumentsStore(
    (state) => state.setAllInstruments,
  );

  // Preset metadata store
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);
  const setKitMeta = usePresetMetaStore((state) => state.setKitMeta);
  const markPresetClean = usePresetMetaStore((state) => state.markPresetClean);
  const hasUnsavedChanges = usePresetMetaStore(
    (state) => state.hasUnsavedChanges,
  );

  // Modal store
  const {
    isSaveModalOpen,
    isSharingModalOpen,
    isSharedModalOpen,
    isResetModalOpen,
    isErrorModalShowing,
    isPresetChangeModalOpen,
    isSharePromptOpen,
    shareableLink,
    presetToChange,
    closeSaveModal,
    closeSharingModal,
    closeSharedModal,
    closeResetModal,
    closeErrorModal,
    closePresetChangeModal,
    closeSharePrompt,
    // openSharedModal,
    openErrorModal,
    openPresetChangeModal,
    openSharePrompt,
  } = useModalStore();

  const kitOptions: (() => KitFileV1)[] = [
    kits.drumhaus,
    kits.organic,
    kits.funk,
    kits.rnb,
    kits.trap,
    kits.eighties,
    kits.tech_house,
    kits.techno,
    kits.indie,
    kits.jungle,
  ];

  const defaultPresetOptions: (() => PresetFileV1)[] = [
    init,
    welcome_to_the_haus,
  ];

  const [selectedKit, setSelectedKit] = useState<string>(currentKitMeta.id);
  const [selectedPreset, setSelectedPreset] = useState<string>(
    currentPresetMeta.id,
  );
  const [presetOptions, setPresetOptions] =
    useState<(() => PresetFileV1)[]>(defaultPresetOptions);

  const modalCloseRef = useRef(null);

  const stopPlayingOnAction = () => {
    if (isPlaying) {
      togglePlay();
    }
  };

  /**
   * Adds a new preset to the options list or updates an existing one.
   * Used for custom presets loaded from files or URL params.
   */
  const addOrUpdatePreset = useCallback(
    (newOption: () => PresetFileV1) => {
      const index = presetOptions.findIndex(
        (option) => option().meta.id === newOption().meta.id,
      );

      if (index !== -1) {
        // Update existing preset (mutating is acceptable here since we're modifying the array directly)
        presetOptions[index] = newOption;
      } else {
        setPresetOptions((prevPresetOptions) => [
          ...prevPresetOptions,
          newOption,
        ]);
      }
    },
    [presetOptions, setPresetOptions],
  );

  /**
   * Updates all relevant states when a preset is loaded or changed.
   * This ensures UI state stays in sync with the loaded preset.
   * @param presetToLoad - The preset to load
   * @param functionToSave - Optional function that returns the preset, added to preset options
   */
  const updateStatesOnPresetChange = useCallback(
    (presetToLoad: PresetFileV1, functionToSave?: () => PresetFileV1) => {
      loadPreset(presetToLoad); // This calls the store's loadPreset which sets meta + cleanPreset
      setSelectedPreset(presetToLoad.meta.id);
      setSelectedKit(presetToLoad.kit.meta.id);

      // Add new presets to the list of options (if provided)
      if (functionToSave) {
        addOrUpdatePreset(functionToSave);
      }
    },
    [loadPreset, setSelectedPreset, setSelectedKit, addOrUpdatePreset],
  );

  const handleSave = (customName: string) => {
    // Generate new metadata for the saved preset
    // TODO: consider checking if name changed and preserving ID and createdAt timestamp
    // however, do not allow this for default presets (could enforce by checking UUID vs human-readable)
    const now = new Date().toISOString();
    const newPresetMeta: Meta = {
      id: crypto.randomUUID(),
      name: customName,
      createdAt: now,
      updatedAt: now,
    };

    const presetToSave = getCurrentPreset(newPresetMeta, currentKitMeta);

    const jsonPreset = JSON.stringify(presetToSave, null, 2);
    const blob = new Blob([jsonPreset], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = `${customName}.dh`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    // Mark preset as clean (saved) in the store
    markPresetClean(presetToSave);

    // Create a function that returns this preset
    const presetFunction = () => presetToSave;
    updateStatesOnPresetChange(presetToSave, presetFunction);
  };

  const handleLoad = () => {
    // TODO: extract to preset library
    stopPlayingOnAction();
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".dh";
    fileInput.onchange = (e) =>
      handleFileChange((e.target as HTMLInputElement).files?.[0]);
    fileInput.click();
  };

  const handleFileChange = (file: File | null | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== "string") {
          throw new Error("Invalid file content");
        }

        const jsonContent: PresetFileV1 = JSON.parse(result);
        updateStatesOnPresetChange(jsonContent);
      } catch (error) {
        console.error("Error parsing preset file:", error);
        openErrorModal();
      }
    };

    reader.onerror = () => {
      console.error("Error reading file");
      openErrorModal();
    };

    reader.readAsText(file);
  };

  const handleReset = () => {
    stopPlayingOnAction();
    closeResetModal();
    updateStatesOnPresetChange(init());
  };

  const handleShare = async () => {
    // TODO: Change to URL based sharing
  };

  const handleKitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    stopPlayingOnAction();

    const selectedKitId = event.target.value;
    const kitOption = kitOptions.find((kit) => kit().meta.id === selectedKitId);

    if (kitOption) {
      const newKit: KitFileV1 = kitOption();
      // Update instruments store (single source of truth)
      setAllInstruments(newKit.instruments);
      // Update kit metadata in store
      setKitMeta(newKit.meta);
      setSelectedKit(newKit.meta.id);
    } else {
      console.error(
        `Kit ${event.target.value} not found in options: ${kitOptions}`,
      );
    }
  };

  /**
   * Handles preset change requests from the selector.
   * If the user has unsaved changes, prompts them with a modal.
   * Otherwise, switches to the new preset directly.
   */
  const handlePresetChangeRequest = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    // Check if current state has unsaved changes
    const changesMade = hasUnsavedChanges();
    const newPresetId = event.target.value;

    if (changesMade) {
      openPresetChangeModal(newPresetId);
    } else {
      switchPreset(newPresetId);
    }
  };

  /**
   * Switches to a different preset by ID.
   * Stops playback if currently playing, then loads the new preset.
   */
  const switchPreset = useCallback(
    (presetId: string) => {
      if (isPlaying) {
        togglePlay();
      }

      const presetOption = presetOptions.find(
        (preset) => preset().meta.id === presetId,
      );

      if (presetOption) {
        const newPreset = presetOption();
        updateStatesOnPresetChange(newPreset, presetOption);
      } else {
        console.error(
          `Preset ${presetId} was not found in options: ${presetOptions}`,
        );
      }
    },
    [presetOptions, isPlaying, togglePlay, updateStatesOnPresetChange],
  );

  const handlePresetChange = useCallback(() => {
    if (isPresetChangeModalOpen) closePresetChangeModal();
    const selectedPresetId = presetToChange;
    switchPreset(selectedPresetId);
  }, [
    presetToChange,
    isPresetChangeModalOpen,
    closePresetChangeModal,
    switchPreset,
  ]);

  // Add custom presets loaded via URL search params
  useEffect(() => {
    const currentPresetExists = presetOptions.some(
      (option) => option().meta.id === currentPresetMeta.id,
    );

    if (!currentPresetExists) {
      // Create a function that returns the current preset from stores
      const customPresetFunction = () =>
        getCurrentPreset(currentPresetMeta, currentKitMeta);

      addOrUpdatePreset(customPresetFunction);
    }
  }, [currentPresetMeta, currentKitMeta, presetOptions, addOrUpdatePreset]);

  // Effect to display share prompt to new users
  useEffect(() => {
    const sharePromptFlag = localStorage.getItem("sharePromptSeen");

    // If the flag is present, the user has visited before
    if (!sharePromptFlag) {
      const timer = setTimeout(() => {
        openSharePrompt();
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, [openSharePrompt]);

  const handleCloseSharePrompt = () => {
    closeSharePrompt();
    localStorage.setItem("sharePromptSeen", "true");
  };

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
            selectedPreset={selectedPreset}
            presetOptions={presetOptions}
            onPresetChangeRequest={handlePresetChangeRequest}
          />

          <KitSelector
            selectedKit={selectedKit}
            kitOptions={kitOptions}
            onKitChange={handleKitChange}
          />

          <PresetActions
            onLoad={handleLoad}
            isSharePromptOpen={isSharePromptOpen}
            onCloseSharePrompt={handleCloseSharePrompt}
          />
        </Box>
      </Center>

      <SaveModal
        isOpen={isSaveModalOpen}
        onClose={closeSaveModal}
        onSave={handleSave}
        modalCloseRef={modalCloseRef}
      />
      <SharingModal
        isOpen={isSharingModalOpen}
        onClose={closeSharingModal}
        onShare={handleShare}
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
      <PresetChangeModal
        isOpen={isPresetChangeModalOpen}
        onClose={closePresetChangeModal}
        onChange={handlePresetChange}
        modalCloseRef={modalCloseRef}
      />
    </>
  );
};
