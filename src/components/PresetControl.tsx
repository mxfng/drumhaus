"use client";

import { Preset, Sample } from "@/types/types";
import { Box, Button, Grid, GridItem, Text } from "@chakra-ui/react";
import { useState } from "react";

type PresetControlProps = {
  preset: Preset;
  setPreset: React.Dispatch<React.SetStateAction<Preset>>;
  samples: Sample[];
  setSamples: React.Dispatch<React.SetStateAction<Sample[]>>;
};

export const PresetControl: React.FC<PresetControlProps> = ({
  preset,
  setPreset,
  samples,
  setSamples,
}) => {
  const exportToJson = () => {
    const jsonPreset = JSON.stringify(preset);
    const blob = new Blob([jsonPreset], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "state.json";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  const loadFromJson = () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
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

  return (
    <Box
      h="100%"
      w="100%"
      boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)"
      borderRadius="8px"
      p={3}
    >
      <Box
        w="100%"
        h="100%"
        borderRadius="4px"
        boxShadow="0 2px 8px rgba(0, 0, 0, 0.2) inset"
      >
        <Box id="mainMenu" p={4}>
          <Grid templateColumns="repeat(4, 1fr)" h="100%" w="100%">
            <GridItem colSpan={1}>
              <Text
                fontFamily={`'Pixelify Sans Variable', sans-serif`}
                color="black"
              >
                Preset:
              </Text>
            </GridItem>
            <GridItem colSpan={3}>
              <Text
                fontFamily={`'Pixelify Sans Variable', sans-serif`}
                color="black"
              >
                {preset.name}
              </Text>
            </GridItem>
            <GridItem>
              <Button onClick={exportToJson}>JSONify Me!</Button>
              <Button onClick={loadFromJson}>Load The JSON Back In!</Button>
            </GridItem>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};
