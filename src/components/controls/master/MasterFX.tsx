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
                value={lowPass}
                onChange={setLowPass}
                label="LP FILTER"
                units="Hz"
                range={MASTER_FILTER_RANGE}
                scale="exp"
                defaultValue={100}
              />
            </GridItem>
            <GridItem>
              <Knob
                value={phaser}
                onChange={setPhaser}
                label="PHASER"
                units="mix"
                range={MASTER_PHASER_WET_RANGE}
                defaultValue={0}
                formatValue={(knobValue) => `${knobValue.toFixed(0)}%`}
              />
            </GridItem>
            <GridItem>
              <Knob
                value={highPass}
                onChange={setHighPass}
                label="HP FILTER"
                units="Hz"
                range={MASTER_FILTER_RANGE}
                scale="exp"
                defaultValue={0}
              />
            </GridItem>
            <GridItem>
              <Knob
                value={reverb}
                onChange={setReverb}
                label="REVERB"
                units="mix"
                range={MASTER_REVERB_WET_RANGE}
                defaultValue={0}
                formatValue={(knobValue) => `${knobValue.toFixed(0)}%`}
              />
            </GridItem>
          </Grid>
        </GridItem>
      </Grid>
    </Box>
  );
};
