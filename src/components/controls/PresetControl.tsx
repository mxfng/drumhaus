"use client";

import * as kits from "@/lib/kits";
import { Kit, Preset, Sequences } from "@/types/types";
import {
  Box,
  Button,
  Center,
  Grid,
  GridItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Select,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { MdOutlineSaveAlt } from "react-icons/md";
import { FaFolderOpen } from "react-icons/fa";
import { IoIosShareAlt } from "react-icons/io";
import { IoMdArrowDropdown } from "react-icons/io";
import { RxReset } from "react-icons/rx";
import { useCallback, useEffect, useRef, useState } from "react";
import { polaroid_bounce } from "@/lib/presets/polaroid_bounce";
import { init } from "@/lib/presets/init";
import { a_drum_called_haus } from "@/lib/presets/a_drum_called_haus";
import { rich_kids } from "@/lib/presets/rich_kids";
import { slime_time } from "@/lib/presets/slime_time";
import { purple_haus } from "@/lib/presets/purple_haus";
import { together_again } from "@/lib/presets/together_again";
import { amsterdam } from "@/lib/presets/amsterdam";
import { sunflower } from "@/lib/presets/sunflower";
import { welcome_to_the_haus } from "@/lib/presets/welcome_to_the_haus";
import { super_dream_haus } from "@/lib/presets/super_dream_haus";
import { ErrorModal } from "../modal/ErrorModal";
import { SaveModal } from "../modal/SaveModal";
import { ResetModal } from "../modal/ResetModal";
import { SharedModal, SharingModal } from "../modal/ShareModals";
import { PresetChangeModal } from "../modal/PresetChangeModal";

type PresetControlProps = {
  preset: Preset;
  setPreset: React.Dispatch<React.SetStateAction<Preset>>;
  kit: Kit;
  setKit: React.Dispatch<React.SetStateAction<Kit>>;
  bpm: number;
  swing: number;
  lowPass: number;
  hiPass: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  masterVolume: number;
  sequences: Sequences;
  attacks: number[];
  releases: number[];
  filters: number[];
  volumes: number[];
  pans: number[];
  solos: boolean[];
  mutes: boolean[];
  pitches: number[];
  chain: number;
  isPlaying: boolean;
  togglePlay: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsModal: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PresetControl: React.FC<PresetControlProps> = ({
  preset,
  setPreset,
  kit,
  setKit,
  bpm,
  swing,
  lowPass,
  hiPass,
  phaser,
  reverb,
  compThreshold,
  compRatio,
  masterVolume,
  sequences,
  attacks,
  releases,
  filters,
  volumes,
  pans,
  solos,
  mutes,
  pitches,
  chain,
  isPlaying,
  togglePlay,
  isLoading,
  setIsLoading,
  setIsModal,
}) => {
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

  const [selectedKit, setSelectedKit] = useState<string>(kit.name);
  const [selectedPreset, setSelectedPreset] = useState<string>(preset.name);
  const [presetOptions, setPresetOptions] =
    useState<(() => Preset)[]>(_presetOptions);
  const [cleanPreset, setCleanPreset] = useState<Preset>(preset);
  const [isSharedModalOpen, setIsSharedModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isErrorModalShowing, setIsErrorModalShowing] = useState(false);
  const [isPresetChangeModalOpen, setIsPresetChangeModalOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState("");
  const [isSharePromptOpen, setIsSharePromptOpen] = useState(false);

  const modalCloseRef = useRef(null);

  const createPresetFunction = (name: string) => () => ({
    name: name,
    _kit: {
      name: kit.name,
      samples: kit.samples,
      _attacks: attacks,
      _releases: releases,
      _filters: filters,
      _pitches: pitches,
      _pans: pans,
      _volumes: volumes,
      _mutes: mutes,
      _solos: solos,
    },
    _sequences: sequences,
    _variation: 0,
    _chain: chain,
    _bpm: bpm,
    _swing: swing,
    _lowPass: lowPass,
    _hiPass: hiPass,
    _phaser: phaser,
    _reverb: reverb,
    _compThreshold: compThreshold,
    _compRatio: compRatio,
    _masterVolume: masterVolume,
  });

  const updateStatesOnPresetChange = (
    presetToSave: Preset,
    functionToSave?: () => Preset
  ) => {
    setPreset(presetToSave);
    setCleanPreset(presetToSave);
    setSelectedPreset(presetToSave.name);
    setSelectedKit(presetToSave._kit.name);

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
    const presetFunctionToSave = createPresetFunction(customName);
    const presetToSave = presetFunctionToSave();

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

    updateStatesOnPresetChange(presetToSave, presetFunctionToSave);
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
    setIsResetModalOpen(false);
    updateStatesOnPresetChange(init());
  };

  const handleShare = async (customName: string) => {
    const presetFunctionToSave = createPresetFunction(customName);
    const presetToSave = presetFunctionToSave();
    const jsonPreset = JSON.stringify(presetToSave);
    const bpm = presetToSave._bpm.toString();
    const kitUsed = presetToSave._kit.name;

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
      setShareableLink(_shareableLink.href);

      setIsSharingModalOpen(false);
      setIsLoading(false);
      setIsSharedModalOpen(true);
    } catch (error) {
      setIsSharingModalOpen(false);
      setIsLoading(false);
      setIsErrorModalShowing(true);
      console.error("Error adding preset:", error);
    }
  };

  const handleKitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    stopPlayingOnAction();

    const selectedKitName = event.target.value;
    const kitOption = kitOptions.find((kit) => kit().name == selectedKitName);

    if (kitOption) {
      const newKit = kitOption();
      setKit(newKit);
      setSelectedKit(newKit.name);
    } else {
      console.error(
        `Kit ${selectedKitName} not found in options: ${kitOptions}`
      );
    }
  };

  const closeSaveModal = () => {
    setIsSaveModalOpen(false);
  };

  const closeSharingModal = () => {
    setIsSharingModalOpen(false);
  };

  const closeSharedModal = () => {
    setIsSharedModalOpen(false);
  };

  const closeResetModal = () => {
    setIsResetModalOpen(false);
  };

  const closeErrorModal = () => {
    setIsErrorModalShowing(false);
  };

  const closePresetChangeModal = () => {
    setIsPresetChangeModalOpen(false);
  };

  const [presetToChange, setPresetToChange] = useState<string>("");

  const handlePresetChangeRequest = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    // Deep equality check between current states and cached preset states
    const cp = cleanPreset;
    const changesMade =
      kit.name !== cp._kit.name ||
      !attacks.every((v, i) => v == cp._kit._attacks[i]) ||
      !releases.every((v, i) => v == cp._kit._releases[i]) ||
      !filters.every((v, i) => v == cp._kit._filters[i]) ||
      !volumes.every((v, i) => v == cp._kit._volumes[i]) ||
      !pans.every((v, i) => v == cp._kit._pans[i]) ||
      !releases.every((v, i) => v == cp._kit._releases[i]) ||
      !pitches.every((v, i) => v == cp._kit._pitches[i]) ||
      bpm !== cp._bpm ||
      swing !== cp._swing ||
      lowPass !== cp._lowPass ||
      hiPass !== cp._hiPass ||
      phaser !== cp._phaser ||
      reverb !== cp._reverb ||
      compThreshold !== cp._compThreshold ||
      compRatio !== cp._compRatio ||
      masterVolume !== cp._masterVolume ||
      sequences !== cp._sequences ||
      chain !== cp._chain;

    const newPreset = event.target.value;

    if (changesMade) {
      setIsPresetChangeModalOpen(true);
      setPresetToChange(newPreset);
    } else {
      switchPreset(newPreset);
    }
  };

  const switchPreset = useCallback(
    (name: string) => {
      stopPlayingOnAction();

      const presetOption = presetOptions.find(
        (preset) => preset().name === name
      );

      if (presetOption) {
        const newPreset = presetOption();
        updateStatesOnPresetChange(newPreset, presetOption);
      } else {
        console.error(
          `Preset ${name} was not found in options: ${presetOptions}`
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [presetOptions, stopPlayingOnAction]
  );

  const addOrUpdatePreset = (newOption: () => Preset) => {
    const index = presetOptions.findIndex(
      (option) => option().name == newOption().name
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
    if (isPresetChangeModalOpen) setIsPresetChangeModalOpen(false);
    const selectedPresetName = presetToChange;
    switchPreset(selectedPresetName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetToChange, isPresetChangeModalOpen]);

  useEffect(() => {
    // Add custom presets loaded via URL search params
    if (!presetOptions.some((option) => option().name == preset.name)) {
      const presetFunctionToSave = (): Preset => ({
        name: preset.name,
        _kit: {
          name: preset._kit.name,
          samples: preset._kit.samples,
          _attacks: preset._kit._attacks,
          _releases: preset._kit._releases,
          _filters: preset._kit._filters,
          _pitches: preset._kit._pitches,
          _pans: preset._kit._pans,
          _volumes: preset._kit._volumes,
          _mutes: preset._kit._mutes,
          _solos: preset._kit._solos,
        },
        _sequences: preset._sequences,
        _variation: 0,
        _chain: preset._chain,
        _bpm: preset._bpm,
        _swing: preset._swing,
        _lowPass: preset._lowPass,
        _hiPass: preset._hiPass,
        _phaser: preset._phaser,
        _reverb: preset._reverb,
        _compThreshold: preset._compThreshold,
        _compRatio: preset._compRatio,
        _masterVolume: preset._masterVolume,
      });

      console.log(preset.name);
      console.log(preset._sequences);
      console.log(presetFunctionToSave);

      updateStatesOnPresetChange(preset, presetFunctionToSave);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // block the spacebar from playing
  useEffect(() => {
    if (isLoading || isSaveModalOpen || isSharingModalOpen) {
      setIsModal(true);
    } else {
      setIsModal(false);
    }
  }, [isLoading, isSaveModalOpen, isSharingModalOpen, setIsModal]);

  // Effect to display share prompt to new users
  useEffect(() => {
    const sharePromptFlag = localStorage.getItem("sharePromptSeen");

    // If the flag is present, the user has visited before
    if (!sharePromptFlag) {
      const timer = setTimeout(() => {
        setIsSharePromptOpen(true);
      }, 60000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeSharePrompt = () => {
    setIsSharePromptOpen(false);
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
          p={3}
          position="relative"
          ref={modalCloseRef}
        >
          <Box
            w="100%"
            borderRadius="8px"
            boxShadow="0 2px 8px rgba(176, 147, 116, 0.6) inset"
            _hover={{
              "& .icon": {
                fill: "darkorange",
                transition: "all 0.2s ease",
              },
            }}
          >
            <Box h="40px" w="100%" id="kit" mb={4} position="relative">
              <Select
                variant="unstyled"
                icon={<></>}
                border="none"
                outline="none"
                value={selectedKit}
                fontFamily={`'Pixelify Sans Variable', sans-serif`}
                color="gray"
                w="332px"
                h="40px"
                borderRadius="8px"
                cursor="pointer"
                pl={4}
                onChange={handleKitChange}
                onKeyDown={(ev) => ev.preventDefault()}
              >
                {kitOptions.map((kit) => (
                  <option key={kit().name} value={kit().name}>
                    {kit().name}
                  </option>
                ))}
              </Select>
              <Button
                bg="transparent"
                position="absolute"
                right={0}
                top={0}
                pointerEvents="none"
              >
                <Box>
                  <Box h="50%" transform="rotate(180deg)" mb={-1}>
                    <IoMdArrowDropdown className="icon" color="#B09374" />
                  </Box>
                  <Box h="50%">
                    <IoMdArrowDropdown className="icon" color="#B09374" />
                  </Box>
                </Box>
              </Button>
            </Box>
          </Box>

          <Text fontSize={12} color="gray" my={-3}>
            KIT
          </Text>

          <Box
            w="100%"
            borderRadius="8px"
            boxShadow="0 2px 8px rgba(176, 147, 116, 0.6) inset"
            _hover={{
              "& .icon": {
                fill: "darkorange",
                transition: "all 0.2s ease",
              },
            }}
          >
            <Box id="preset" h="40px" mt={4} mb={4} position="relative">
              <Select
                variant="unstyled"
                icon={<></>}
                value={selectedPreset}
                fontFamily={`'Pixelify Sans Variable', sans-serif`}
                color="gray"
                w="332px"
                h="40px"
                borderRadius="8px"
                cursor="pointer"
                onChange={handlePresetChangeRequest}
                onKeyDown={(ev) => ev.preventDefault()}
                pl={4}
              >
                {presetOptions.map((preset) => (
                  <option key={preset().name} value={preset().name}>
                    {preset().name}
                  </option>
                ))}
              </Select>
              <Button
                bg="transparent"
                position="absolute"
                right={0}
                top={0}
                pointerEvents="none"
              >
                <Box>
                  <Box h="50%" transform="rotate(180deg)" mb={-1}>
                    <IoMdArrowDropdown className="icon" color="#B09374" />
                  </Box>
                  <Box h="50%">
                    <IoMdArrowDropdown className="icon" color="#B09374" />
                  </Box>
                </Box>
              </Button>
            </Box>
          </Box>

          <Text fontSize={12} color="gray" my={-3} mb={-1}>
            PRESET
          </Text>

          <Grid
            templateColumns="repeat(4, 1fr)"
            className="neumorphic"
            borderRadius="8px"
            mt={2}
          >
            <GridItem>
              <Center>
                <Tooltip
                  label="Download to file"
                  color="darkorange"
                  openDelay={500}
                >
                  <Button
                    onClick={() => setIsSaveModalOpen(true)}
                    w="100%"
                    borderRadius="8px 0 0 8px"
                    className="raised"
                    _hover={{
                      "& .icon": {
                        fill: "darkorange",
                        transition: "all 0.2s ease",
                      },
                    }}
                  >
                    <MdOutlineSaveAlt
                      className="icon"
                      color="#B09374"
                      size="20px"
                    />
                  </Button>
                </Tooltip>
              </Center>
            </GridItem>
            <GridItem>
              <Center>
                <Tooltip
                  label="Load from file"
                  color="darkorange"
                  openDelay={500}
                >
                  <Button
                    onClick={handleLoad}
                    w="100%"
                    borderRadius="0 0 0 0"
                    className="raised"
                    _hover={{
                      "& .icon": {
                        fill: "darkorange",
                        transition: "all 0.2s ease",
                      },
                    }}
                  >
                    <FaFolderOpen
                      className="icon"
                      color="#B09374"
                      size="20px"
                    />
                  </Button>
                </Tooltip>
              </Center>
            </GridItem>
            <GridItem>
              <Center>
                <Popover
                  isOpen={isSharePromptOpen}
                  onClose={closeSharePrompt}
                  isLazy
                >
                  <Tooltip
                    label="Share as link"
                    color="darkorange"
                    openDelay={500}
                  >
                    <Box display="inline-block" w="100%">
                      <PopoverTrigger>
                        <Button
                          onClick={() => setIsSharingModalOpen(true)}
                          w="100%"
                          borderRadius="0 0 0 0"
                          className="raised"
                          _hover={{
                            "& .icon": {
                              fill: "darkorange",
                              transition: "all 0.2s ease",
                            },
                          }}
                        >
                          <IoIosShareAlt
                            className="icon"
                            fill="#B09374"
                            transition="all 0.2s ease"
                            size="26px"
                          />
                        </Button>
                      </PopoverTrigger>
                    </Box>
                  </Tooltip>

                  <PopoverContent
                    bg="silver"
                    className="neumorphic"
                    borderColor="silver"
                  >
                    <PopoverArrow bg="silver" className="neumorphic" />
                    <PopoverCloseButton color="gray" />
                    <PopoverHeader color="gray">
                      Enjoying Drumhaus?
                    </PopoverHeader>
                    <PopoverBody color="gray">
                      You can save your preset to the cloud and share it with a
                      link using the share button!
                    </PopoverBody>
                    <PopoverFooter color="transparent">
                      <Button
                        bg="darkorange"
                        color="silver"
                        onClick={closeSharePrompt}
                      >
                        Dismiss
                      </Button>
                    </PopoverFooter>
                  </PopoverContent>
                </Popover>
              </Center>
            </GridItem>
            <GridItem>
              <Center>
                <Tooltip label="Reset all" color="darkorange" openDelay={500}>
                  <Button
                    onClick={() => setIsResetModalOpen(true)}
                    w="100%"
                    borderRadius="0 8px 8px 0"
                    className="raised"
                    _hover={{
                      "& .iconReset": {
                        color: "#ff7b00",
                        transition: "all 0.2s ease",
                      },
                    }}
                  >
                    <RxReset
                      className="iconReset"
                      color="#B09374"
                      transition="all 0.2s ease"
                      size="20px"
                    />
                  </Button>
                </Tooltip>
              </Center>
            </GridItem>
          </Grid>
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
