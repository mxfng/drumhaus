import { Box, Grid, GridItem, Text } from "@chakra-ui/react";
import { Knob } from "../common/Knob";
import { useMasterFXStore } from "@/stores/useMasterFXStore";

export const MasterCompressor: React.FC = () => {
  // Get state from Master FX Store
  const threshold = useMasterFXStore((state) => state.compThreshold);
  const ratio = useMasterFXStore((state) => state.compRatio);

  // Get actions from store
  const setThreshold = useMasterFXStore((state) => state.setCompThreshold);
  const setRatio = useMasterFXStore((state) => state.setCompRatio);
  return (
    <Box h="100%" w="130px">
      <Grid templateColumns="repeat(2, 1fr)">
        <GridItem position="relative">
          <Text
            transform="rotate(-90deg)"
            position="absolute"
            left={-2}
            bottom="70px"
            color="gray"
            fontSize={12}
            opacity={0.5}
          >
            COMPRESSOR
          </Text>
        </GridItem>
        <GridItem>
          <Knob
            size={60}
            knobValue={threshold}
            setKnobValue={setThreshold}
            knobTitle="THRESHOLD"
            knobTransformRange={[-30, 0]}
            knobUnits="dB"
            defaultValue={100}
          />
          <Knob
            size={60}
            knobValue={ratio}
            setKnobValue={setRatio}
            knobTitle="RATIO"
            knobTransformRange={[1, 8]}
            knobUnits=": 1"
            defaultValue={43}
          />
        </GridItem>
      </Grid>
    </Box>
  );
};
