import { Box, Grid, GridItem, Text } from "@chakra-ui/react";
import { Knob } from "../common/Knob";

type MasterFXProps = {
  lowPass: number;
  setLowPass: React.Dispatch<React.SetStateAction<number>>;
  hiPass: number;
  setHiPass: React.Dispatch<React.SetStateAction<number>>;
  phaser: number;
  setPhaser: React.Dispatch<React.SetStateAction<number>>;
  reverb: number;
  setReverb: React.Dispatch<React.SetStateAction<number>>;
};

export const MasterFX: React.FC<MasterFXProps> = ({
  lowPass,
  setLowPass,
  hiPass,
  setHiPass,
  phaser,
  setPhaser,
  reverb,
  setReverb,
}) => {
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
