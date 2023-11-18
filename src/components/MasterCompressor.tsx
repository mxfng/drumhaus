import { Box, Grid, GridItem, Text } from "@chakra-ui/react";
import { Knob } from "./Knob";

type MasterCompressorProps = {
  threshold: number;
  setThreshold: React.Dispatch<React.SetStateAction<number>>;
  ratio: number;
  setRatio: React.Dispatch<React.SetStateAction<number>>;
};

export const MasterCompressor: React.FC<MasterCompressorProps> = ({
  threshold,
  setThreshold,
  ratio,
  setRatio,
}) => {
  return (
    <Box h="100%" w="130px">
      <Grid templateColumns="repeat(2, 1fr)">
        <GridItem position="relative">
          <Text
            transform="rotate(-90deg)"
            position="absolute"
            left={-1}
            bottom="70px"
            color="gray"
            fontSize={12}
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
          />
          <Knob
            size={60}
            knobValue={ratio}
            setKnobValue={setRatio}
            knobTitle="RATIO"
            knobTransformRange={[1, 8]}
            knobUnits=": 1"
          />
        </GridItem>
      </Grid>
    </Box>
  );
};
