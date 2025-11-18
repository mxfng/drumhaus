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

  const _presetOptions: (() => Preset)[] = [
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
    useState<(() => Preset)[]>(_presetOptions);
  const [cleanPreset, setCleanPreset] = useState<Preset>(
    getCurrentPreset(currentPresetName, currentKitName),
  );

  const modalCloseRef = useRef(null);

  const updateStatesOnPresetChange = (
    presetToLoad: Preset,
    functionToSave?: () => Preset,
  ) => {
    loadPreset(presetToLoad);
    setCleanPreset(presetToLoad);
    setSelectedPreset(presetToLoad.name);
    setSelectedKit(presetToLoad.kit.name);

    // Add new presets to the list of options (if provided)
    if (functionToSave) {
      addOrUpdatePreset(functionToSave);
    }
  };

  const stopPlayingOnAction = () => {
    if (isPlaying) {
      togglePlay();
    }
  };

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
        const jsonContent: Preset = JSON.parse(e.target?.result as string);
        updateStatesOnPresetChange(jsonContent);
      } catch (error) {
        console.error("Error parsing DH JSON:", error);
      }
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
        throw new Error("Failed to add preset");
      }

      const { presetKey } = await response.json();

      const _shareableLink = new URL("/", window.location.origin);
      _shareableLink.searchParams.append("preset", presetKey);

      navigator.clipboard.writeText(_shareableLink.href);

      closeSharingModal();
      setIsLoading(false);
      openSharedModal(_shareableLink.href);
    } catch (error) {
      closeSharingModal();
      setIsLoading(false);
      openErrorModal();
      console.error("Error adding preset:", error);
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

  const switchPreset = useCallback(
    (name: string) => {
      stopPlayingOnAction();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presetOptions, stopPlayingOnAction],
  );

  const addOrUpdatePreset = (newOption: () => Preset) => {
    const index = presetOptions.findIndex(
      (option) => option().name == newOption().name,
    );

    if (index !== -1) {
      presetOptions[index] = newOption;
    } else {
      setPresetOptions((prevPresetOptions) => {
        const newPresetOptions = [...prevPresetOptions, newOption];
        return newPresetOptions;
      });
    }
  };

  const handlePresetChange = useCallback(() => {
    if (isPresetChangeModalOpen) closePresetChangeModal();
    const selectedPresetName = presetToChange;
    switchPreset(selectedPresetName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetToChange, isPresetChangeModalOpen]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPresetName]);

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
