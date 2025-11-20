import { Box, Grid, GridItem, Text } from "@chakra-ui/react";

import {
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
} from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterCompressor: React.FC = () => {
  // Get state from Master FX Store
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);

  // Get actions from store
  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
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
            value={threshold}
            onChange={setThreshold}
            label="THRESHOLD"
            units="dB"
            range={MASTER_COMP_THRESHOLD_RANGE}
            defaultValue={100}
          />
          <Knob
            value={ratio}
            onChange={setRatio}
            label="RATIO"
            units=": 1"
            range={MASTER_COMP_RATIO_RANGE}
            defaultValue={43}
          />
        </GridItem>
      </Grid>
    </Box>
  );
};
