"use client";

import * as init from "@/lib/init";
import { Kit, Preset, Sequences } from "@/types/types";
import { Box, Button, Center, Select, Text } from "@chakra-ui/react";
import { MdOutlineSaveAlt } from "react-icons/md";
import { FaFolderOpen } from "react-icons/fa";
import { IoShareSharp } from "react-icons/io5";
import { IoMdArrowDropdown } from "react-icons/io";
import { RxReset } from "react-icons/rx";

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
  stopPlay: () => void;
};

export const PresetControl: React.FC<PresetControlProps> = ({
  preset,
  setPreset,
  kit,
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
  stopPlay,
}) => {
  const exportToJson = () => {
    const customName: string = prompt("Enter a custom name:") || "custom";
    const presetToSave: Preset = {
      name: customName,
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
    };
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
  };

  const loadFromJson = () => {
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
        const jsonContent = JSON.parse(e.target?.result as string);
        // Assuming jsonContent is a valid Preset object
        setPreset(jsonContent);
        // You may need to handle samples loading if they are part of your preset
        // setSamples(jsonContent.samples);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };

    reader.readAsText(file);
  };

  const handleReset = () => {
    stopPlay();

    const isConfirmed = window.confirm(
      "Are you sure you want to reset all values to their initialized settings?"
    );

    if (isConfirmed) {
      setPreset(() => {
        return init.createPreset();
      });
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
          <Box
            h="40px"
            w="100%"
            id="kit"
            px={4}
            py={2}
            mb={4}
            position="relative"
          >
            <Select
              variant="unstyled"
              placeholder={`${preset._kit.name}.dhkit`}
              fontFamily={`'Pixelify Sans Variable', sans-serif`}
              color="gray"
              position="absolute"
              w="312px"
              cursor="pointer"
            ></Select>

            <Box
              position="absolute"
              h="23px"
              w="15px"
              right={4}
              top={2}
              bg="silver"
              filter="blur(2px)"
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
          <Box
            id="preset"
            h="40px"
            px={4}
            py={2}
            mt={4}
            mb={4}
            position="relative"
          >
            <Select
              variant="unstyled"
              placeholder={`${preset.name}.dh`}
              fontFamily={`'Pixelify Sans Variable', sans-serif`}
              color="gray"
              position="absolute"
              w="312px"
              overflow="hidden"
              cursor="pointer"
            ></Select>

            <Box
              position="absolute"
              h="23px"
              w="15px"
              right={4}
              top={2}
              bg="silver"
              filter="blur(2px)"
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
            "& .iconReset": {
              color: "#ff7b00",
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
            "& .icon": {
              fill: "darkorange",
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
