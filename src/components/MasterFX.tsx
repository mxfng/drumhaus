import { Box, Grid, GridItem } from "@chakra-ui/react";
import { Knob } from "./Knob";

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
        <GridItem>
          <Knob
            size={60}
            knobValue={lowPass}
            setKnobValue={setLowPass}
            knobTitle="LP FILTER"
            knobTransformRange={[0, 15000]}
            knobUnits="Hz"
            exponential={true}
          />
        </GridItem>
        <GridItem>
          <Knob
            size={60}
            knobValue={phaser}
            setKnobValue={setPhaser}
            knobTitle="PHASER"
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
          />
        </GridItem>
        <GridItem>
          <Knob
            size={60}
            knobValue={reverb}
            setKnobValue={setReverb}
            knobTitle="REVERB"
          />
        </GridItem>
      </Grid>
    </Box>
  );
};
