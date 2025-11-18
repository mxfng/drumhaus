import { Box, Grid, GridItem, Text } from "@chakra-ui/react";

import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../common/Knob";

export const MasterFX: React.FC = () => {
  // Get state from Master FX Store
  const lowPass = useMasterChainStore((state) => state.lowPass);
  const hiPass = useMasterChainStore((state) => state.hiPass);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);

  // Get actions from store
  const setLowPass = useMasterChainStore((state) => state.setLowPass);
  const setHiPass = useMasterChainStore((state) => state.setHiPass);
  const setPhaser = useMasterChainStore((state) => state.setPhaser);
  const setReverb = useMasterChainStore((state) => state.setReverb);
  return (
    <Box>
      <Grid templateColumns="repeat(2, 1fr)">
        <GridItem position="relative">
          <Text
            transform="rotate(-90deg)"
            position="absolute"
            left={-10}
            w="70px"
            bottom="70px"
            color="gray"
            fontSize={12}
            opacity={0.5}
          >
            MASTER FX
          </Text>
        </GridItem>
        <GridItem>
          <Grid templateColumns="repeat(2, 1fr)">
            <GridItem>
              <Knob
                size={60}
                knobValue={lowPass}
                setKnobValue={setLowPass}
                knobTitle="LP FILTER"
                knobTransformRange={[0, 15000]}
                knobUnits="Hz"
                exponential={true}
                defaultValue={100}
              />
            </GridItem>
            <GridItem>
              <Knob
                size={60}
                knobValue={phaser}
                setKnobValue={setPhaser}
                knobTitle="PHASER"
                defaultValue={0}
              />
            </GridItem>
            <GridItem>
              <Knob
                size={60}
                knobValue={hiPass}
                setKnobValue={setHiPass}
                knobTitle="HP FILTER"
                knobTransformRange={[0, 15000]}
                knobUnits="Hz"
                exponential={true}
                defaultValue={0}
              />
            </GridItem>
            <GridItem>
              <Knob
                size={60}
                knobValue={reverb}
                setKnobValue={setReverb}
                knobTitle="REVERB"
                defaultValue={0}
              />
            </GridItem>
          </Grid>
        </GridItem>
      </Grid>
    </Box>
  );
};
