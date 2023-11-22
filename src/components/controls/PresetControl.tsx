"use client";

import * as kits from "@/lib/kits";
import { Kit, Preset, Sequences } from "@/types/types";
import { Box, Button, Center, Select, Text } from "@chakra-ui/react";
import { MdOutlineSaveAlt } from "react-icons/md";
import { FaFolderOpen } from "react-icons/fa";
import { IoShareSharp } from "react-icons/io5";
import { IoMdArrowDropdown } from "react-icons/io";
import { RxReset } from "react-icons/rx";
import { useState } from "react";
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
  chain: number;
  isPlaying: boolean;
  togglePlay: () => Promise<void>;
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
  chain,
  isPlaying,
  togglePlay,
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

  const createPresetFunction = (name: string) => () => ({
    name: name,
    _kit: {
      name: kit.name,
      samples: kit.samples,
      _attacks: attacks,
      _releases: releases,
      _filters: filters,
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

  const exportToJson = () => {
    const customName: string = prompt("Enter a custom name:") || "custom";
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
      setPresetOptions((prevOptions) => [...prevOptions, functionToSave]);
    }
  };

  const loadFromJson = () => {
    if (isPlaying) {
      togglePlay();
    }
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
        const presetOption = () => jsonContent;
        updateStatesOnPresetChange(jsonContent, presetOption);
      } catch (error) {
        console.error("Error parsing DH JSON:", error);
      }
    };

    reader.readAsText(file);
  };

  const handleReset = () => {
    if (isPlaying) {
      togglePlay();
    }

    const isConfirmed = window.confirm(
      "Are you sure you want to reset all values to their initialized settings?"
    );

    if (isConfirmed) {
      updateStatesOnPresetChange(init());
    }
  };

  const handleKitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isPlaying) {
      togglePlay();
    }

    const selectedKitName = event.target.value;
    const kitOption = kitOptions.find((kit) => kit.name == selectedKitName);

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

  const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isPlaying) {
      togglePlay();
    }

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

    let isConfirmed = true;
    if (changesMade) {
      isConfirmed = window.confirm(
        "Are you sure you want to switch to a new preset? You will lose any unsaved work on the current preset."
      );
    }

    if (isConfirmed) {
      const selectedPresetName = event.target.value;
      const presetOption = presetOptions.find(
        (preset) => preset().name === selectedPresetName
      );

      if (presetOption) {
        const newPreset = presetOption();
        updateStatesOnPresetChange(newPreset);
      }
    }
  };

  return (
    <Center h="100%">
      <Box
        w="100%"
        h="155px"
        className="neumorphicExtraTall"
        borderRadius="8px"
        p={3}
        position="relative"
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
            >
              {kitOptions.map((kit) => (
                <option key={kit().name} value={kit().name}>
                  {kit().name}
                </option>
              ))}
            </Select>

            <Box
              position="absolute"
              h="23px"
              w="15px"
              right={3}
              top={2}
              bg="silver"
              pointerEvents="none"
            />

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
              value={selectedPreset}
              fontFamily={`'Pixelify Sans Variable', sans-serif`}
              color="gray"
              w="332px"
              h="40px"
              borderRadius="8px"
              cursor="pointer"
              onChange={handlePresetChange}
              pl={4}
            >
              {presetOptions.map((preset) => (
                <option key={preset().name} value={preset().name}>
                  {preset().name}
                </option>
              ))}
            </Select>

            <Box
              position="absolute"
              h="23px"
              w="15px"
              right={3}
              top={2}
              bg="silver"
              pointerEvents="none"
            />

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

        <Button
          title="Save"
          onClick={exportToJson}
          position="absolute"
          right="120px"
          w="20px"
          p={0}
          bottom={0}
          _hover={{
            "& .icon": {
              fill: "darkorange",
              transition: "all 0.2s ease",
            },
          }}
        >
          <MdOutlineSaveAlt className="icon" color="#B09374" />
        </Button>

        <Button
          title="Load"
          onClick={loadFromJson}
          position="absolute"
          right="80px"
          w="20px"
          bottom={0}
          p={0}
          _hover={{
            "& .icon": {
              fill: "darkorange",
              transition: "all 0.2s ease",
            },
          }}
        >
          <FaFolderOpen className="icon" color="#B09374" />
        </Button>
        <Button
          title="Share"
          w="20px"
          position="absolute"
          right="40px"
          bottom={0}
          p={0}
          _hover={{
            "& .icon": {
              fill: "darkorange",
              transition: "all 0.2s ease",
            },
          }}
        >
          <IoShareSharp
            className="icon"
            fill="#B09374"
            transition="all 0.2s ease"
          />
        </Button>
        <Button
          title="Reset All"
          onClick={handleReset}
          w="20px"
          position="absolute"
          right={0}
          bottom={0}
          p={0}
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
          />
        </Button>
      </Box>
    </Center>
  );
};
