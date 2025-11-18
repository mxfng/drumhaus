"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Center } from "@chakra-ui/react";

import * as kits from "@/lib/kit";
import { init } from "@/lib/preset/bin/ts/init";
import { welcome_to_the_haus } from "@/lib/preset/bin/ts/welcome_to_the_haus";
import { arePresetsEqual, getCurrentPreset } from "@/lib/preset/helpers";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useModalStore } from "@/stores/useModalStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { KitFileV1 } from "@/types/instrument";
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
  currentPresetId: string;
  currentPresetName: string;
  currentKitId: string;
  currentKitName: string;
  loadPreset: (preset: PresetFileV1) => void;
  setCurrentKitId: React.Dispatch<React.SetStateAction<string>>;
  setCurrentKitName: React.Dispatch<React.SetStateAction<string>>;
  setCurrentPresetId: React.Dispatch<React.SetStateAction<string>>;
  setCurrentPresetName: React.Dispatch<React.SetStateAction<string>>;
  togglePlay: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PresetControl: React.FC<PresetControlProps> = ({
  currentPresetId,
  currentPresetName,
  currentKitId,
  currentKitName,
  loadPreset,
  setCurrentKitId,
  setCurrentKitName,
  setCurrentPresetId,
  setCurrentPresetName,
  togglePlay,
  isLoading,
  setIsLoading,
}) => {
  // Subscribe to stores for UI updates
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const setAllInstruments = useInstrumentsStore(
    (state) => state.setAllInstruments,
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
    // TODO: Add remaining kits once they are converted to .dhkit files
  ];

  const defaultPresetOptions: (() => PresetFileV1)[] = [
    init,
    welcome_to_the_haus,
  ];

  const [selectedKit, setSelectedKit] = useState<string>(currentKitId);
  const [selectedPreset, setSelectedPreset] = useState<string>(currentPresetId);
  const [presetOptions, setPresetOptions] =
    useState<(() => PresetFileV1)[]>(defaultPresetOptions);
  const [cleanPreset, setCleanPreset] = useState<PresetFileV1>(
    getCurrentPreset(
      currentPresetId,
      currentPresetName,
      currentKitId,
      currentKitName,
    ),
  );

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
      loadPreset(presetToLoad);
      setCleanPreset(presetToLoad);
      setSelectedPreset(presetToLoad.meta.id);
      setCurrentPresetId(presetToLoad.meta.id);
      setCurrentPresetName(presetToLoad.meta.name);
      setSelectedKit(presetToLoad.kit.meta.id);
      setCurrentKitId(presetToLoad.kit.meta.id);
      setCurrentKitName(presetToLoad.kit.meta.name);

      // Add new presets to the list of options (if provided)
      if (functionToSave) {
        addOrUpdatePreset(functionToSave);
      }
    },
    [
      loadPreset,
      setCleanPreset,
      setSelectedPreset,
      setCurrentPresetId,
      setCurrentPresetName,
      setSelectedKit,
      setCurrentKitId,
      setCurrentKitName,
      addOrUpdatePreset,
    ],
  );

  const handleSave = (customName: string) => {
    // TODO: extract to preset library
    // Generate new IDs for the saved preset
    const newPresetId = crypto.randomUUID();
    const presetToSave = getCurrentPreset(
      newPresetId,
      customName,
      currentKitId,
      currentKitName,
    );

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
      // Update kit metadata
      setCurrentKitId(newKit.meta.id);
      setCurrentKitName(newKit.meta.name);
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
    // Check if current state differs from loaded preset
    const currentState = getCurrentPreset(
      currentPresetId,
      currentPresetName,
      currentKitId,
      currentKitName,
    );
    const cp = cleanPreset;

    // Deep equality check using proper comparison
    const changesMade = !arePresetsEqual(currentState, cp);

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
      (option) => option().meta.id === currentPresetId,
    );

    if (!currentPresetExists) {
      // Create a function that returns the current preset from stores
      const customPresetFunction = () =>
        getCurrentPreset(
          currentPresetId,
          currentPresetName,
          currentKitId,
          currentKitName,
        );

      addOrUpdatePreset(customPresetFunction);
    }
  }, [
    currentPresetId,
    currentPresetName,
    currentKitId,
    currentKitName,
    presetOptions,
    addOrUpdatePreset,
  ]);

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
