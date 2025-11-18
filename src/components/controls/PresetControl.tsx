"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Center } from "@chakra-ui/react";

import * as kits from "@/lib/drumhausKits";
import { a_drum_called_haus } from "@/lib/preset/dh/a_drum_called_haus";
import { amsterdam } from "@/lib/preset/dh/amsterdam";
import { init } from "@/lib/preset/dh/init";
import { polaroid_bounce } from "@/lib/preset/dh/polaroid_bounce";
import { purple_haus } from "@/lib/preset/dh/purple_haus";
import { rich_kids } from "@/lib/preset/dh/rich_kids";
import { slime_time } from "@/lib/preset/dh/slime_time";
import { sunflower } from "@/lib/preset/dh/sunflower";
import { super_dream_haus } from "@/lib/preset/dh/super_dream_haus";
import { together_again } from "@/lib/preset/dh/together_again";
import { welcome_to_the_haus } from "@/lib/preset/dh/welcome_to_the_haus";
import { arePresetsEqual, getCurrentPreset } from "@/lib/preset/helpers";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useModalStore } from "@/stores/useModalStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { Kit } from "@/types/instrument";
import type { Preset } from "@/types/preset";
import { ErrorModal } from "../modal/ErrorModal";
import { PresetChangeModal } from "../modal/PresetChangeModal";
import { ResetModal } from "../modal/ResetModal";
import { SaveModal } from "../modal/SaveModal";
import { SharedModal, SharingModal } from "../modal/ShareModals";
import { KitSelector } from "./preset/KitSelector";
import { PresetActions } from "./preset/PresetActions";
import { PresetSelector } from "./preset/PresetSelector";

type PresetControlProps = {
  currentPresetName: string;
  currentKitName: string;
  loadPreset: (preset: Preset) => void;
  setCurrentKitName: React.Dispatch<React.SetStateAction<string>>;
  togglePlay: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PresetControl: React.FC<PresetControlProps> = ({
  currentPresetName,
  currentKitName,
  loadPreset,
  setCurrentKitName,
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
    openSharedModal,
    openErrorModal,
    openPresetChangeModal,
    openSharePrompt,
  } = useModalStore();

  const kitOptions: (() => Kit)[] = [
    kits.drumhaus,
    kits.eighties,
    kits.funk,
    kits.indie,
    kits.jungle,
    kits.organic,
    kits.rnb,
    kits.tech_house,
    kits.techno,
    kits.trap,
  ];

  const defaultPresetOptions: (() => Preset)[] = [
    init,
    welcome_to_the_haus,
    a_drum_called_haus,
    polaroid_bounce,
    rich_kids,
    slime_time,
    purple_haus,
    together_again,
    amsterdam,
    sunflower,
    super_dream_haus,
  ];

  const [selectedKit, setSelectedKit] = useState<string>(currentKitName);
  const [selectedPreset, setSelectedPreset] =
    useState<string>(currentPresetName);
  const [presetOptions, setPresetOptions] =
    useState<(() => Preset)[]>(defaultPresetOptions);
  const [cleanPreset, setCleanPreset] = useState<Preset>(
    getCurrentPreset(currentPresetName, currentKitName),
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
    (newOption: () => Preset) => {
      const index = presetOptions.findIndex(
        (option) => option().name === newOption().name,
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
    (presetToLoad: Preset, functionToSave?: () => Preset) => {
      loadPreset(presetToLoad);
      setCleanPreset(presetToLoad);
      setSelectedPreset(presetToLoad.name);
      setSelectedKit(presetToLoad.kit.name);

      // Add new presets to the list of options (if provided)
      if (functionToSave) {
        addOrUpdatePreset(functionToSave);
      }
    },
    [
      loadPreset,
      setCleanPreset,
      setSelectedPreset,
      setSelectedKit,
      addOrUpdatePreset,
    ],
  );

  const handleSave = (customName: string) => {
    const presetToSave = getCurrentPreset(customName, currentKitName);

    const jsonPreset = JSON.stringify(presetToSave);
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

        const jsonContent: Preset = JSON.parse(result);
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

  const handleShare = async (customName: string) => {
    const presetToSave = getCurrentPreset(customName, currentKitName);
    const jsonPreset = JSON.stringify(presetToSave);
    const bpm = presetToSave.bpm.toString();
    const kitUsed = presetToSave.kit.name;

    try {
      const url = new URL("/api/presets", window.location.origin);
      url.searchParams.append("preset_data", jsonPreset);
      url.searchParams.append("custom_name", customName);
      url.searchParams.append("kit_used", kitUsed);
      url.searchParams.append("bpm", bpm);

      const response = await fetch(url.href, {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to add preset: ${response.status} ${errorText}`,
        );
      }

      const data = await response.json();

      if (!data.presetKey || typeof data.presetKey !== "string") {
        throw new Error("Invalid response from server");
      }

      const shareableLink = new URL("/", window.location.origin);
      shareableLink.searchParams.append("preset", data.presetKey);

      await navigator.clipboard.writeText(shareableLink.href);

      closeSharingModal();
      setIsLoading(false);
      openSharedModal(shareableLink.href);
    } catch (error) {
      closeSharingModal();
      setIsLoading(false);
      openErrorModal();
      console.error("Error sharing preset:", error);
    }
  };

  const handleKitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    stopPlayingOnAction();

    const selectedKitName = event.target.value;
    const kitOption = kitOptions.find((kit) => kit().name == selectedKitName);

    if (kitOption) {
      const newKit = kitOption();
      // Update instruments store (single source of truth)
      setAllInstruments(newKit.instruments);
      // Update kit name metadata
      setCurrentKitName(newKit.name);
      setSelectedKit(newKit.name);
    } else {
      console.error(
        `Kit ${selectedKitName} not found in options: ${kitOptions}`,
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
    const currentState = getCurrentPreset(currentPresetName, currentKitName);
    const cp = cleanPreset;

    // Deep equality check using proper comparison
    const changesMade = !arePresetsEqual(currentState, cp);

    const newPreset = event.target.value;

    if (changesMade) {
      openPresetChangeModal(newPreset);
    } else {
      switchPreset(newPreset);
    }
  };

  /**
   * Switches to a different preset by name.
   * Stops playback if currently playing, then loads the new preset.
   */
  const switchPreset = useCallback(
    (name: string) => {
      if (isPlaying) {
        togglePlay();
      }

      const presetOption = presetOptions.find(
        (preset) => preset().name === name,
      );

      if (presetOption) {
        const newPreset = presetOption();
        updateStatesOnPresetChange(newPreset, presetOption);
      } else {
        console.error(
          `Preset ${name} was not found in options: ${presetOptions}`,
        );
      }
    },
    [presetOptions, isPlaying, togglePlay, updateStatesOnPresetChange],
  );

  const handlePresetChange = useCallback(() => {
    if (isPresetChangeModalOpen) closePresetChangeModal();
    const selectedPresetName = presetToChange;
    switchPreset(selectedPresetName);
  }, [
    presetToChange,
    isPresetChangeModalOpen,
    closePresetChangeModal,
    switchPreset,
  ]);

  // Add custom presets loaded via URL search params
  useEffect(() => {
    const currentPresetExists = presetOptions.some(
      (option) => option().name === currentPresetName,
    );

    if (!currentPresetExists) {
      // Create a function that returns the current preset from stores
      const customPresetFunction = () =>
        getCurrentPreset(currentPresetName, currentKitName);

      addOrUpdatePreset(customPresetFunction);
    }
  }, [currentPresetName, currentKitName, presetOptions, addOrUpdatePreset]);

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
