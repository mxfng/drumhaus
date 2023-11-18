import { Preset, Sample } from "@/types/types";
import { Box, Grid, GridItem, Text } from "@chakra-ui/react";

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
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};
