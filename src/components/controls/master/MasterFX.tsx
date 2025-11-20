import { Box, Grid, GridItem, Text } from "@chakra-ui/react";

import {
  MASTER_FILTER_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_WET_RANGE,
} from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterFX: React.FC = () => {
  // Get state from Master FX Store
  const lowPass = useMasterChainStore((state) => state.lowPass);
  const highPass = useMasterChainStore((state) => state.highPass);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);

  // Get actions from store
  const setLowPass = useMasterChainStore((state) => state.setLowPass);
  const setHighPass = useMasterChainStore((state) => state.setHighPass);
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
                knobTransformRange={MASTER_FILTER_RANGE}
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
                knobTransformRange={MASTER_PHASER_WET_RANGE}
                knobUnits="mix"
                defaultValue={0}
              />
            </GridItem>
            <GridItem>
              <Knob
                size={60}
                knobValue={highPass}
                setKnobValue={setHighPass}
                knobTitle="HP FILTER"
                knobTransformRange={MASTER_FILTER_RANGE}
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
                knobTransformRange={MASTER_REVERB_WET_RANGE}
                knobUnits="mix"
                defaultValue={0}
              />
            </GridItem>
          </Grid>
        </GridItem>
      </Grid>
    </Box>
  );
};
