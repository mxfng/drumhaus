import { Box, Grid, GridItem, Text } from "@chakra-ui/react";

import { useMasterFXStore } from "@/stores/useMasterFXStore";
import { Knob } from "../common/Knob";

export const MasterFX: React.FC = () => {
  // Get state from Master FX Store
  const lowPass = useMasterFXStore((state) => state.lowPass);
  const hiPass = useMasterFXStore((state) => state.hiPass);
  const phaser = useMasterFXStore((state) => state.phaser);
  const reverb = useMasterFXStore((state) => state.reverb);

  // Get actions from store
  const setLowPass = useMasterFXStore((state) => state.setLowPass);
  const setHiPass = useMasterFXStore((state) => state.setHiPass);
  const setPhaser = useMasterFXStore((state) => state.setPhaser);
  const setReverb = useMasterFXStore((state) => state.setReverb);
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
