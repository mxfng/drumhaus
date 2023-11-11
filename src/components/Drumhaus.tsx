"use client";

import * as init from "@/lib/init";
import { DHSampler, SlotData } from "@/types/types";
import { Box, Button, Center, Grid, Heading } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Slot } from "./Slot";

const Drumhaus = () => {
  // Provide state array of Drumhaus samplers
  const [dhSamplers, setDhSamplers] = useState<DHSampler[]>(init._dhSamplers);

  // Provide state arrays of slot paramters
  const [volumes, setVolumes] = useState<number[]>(init._volumes);
  const [solos, setSolos] = useState<boolean[]>(init._solos);
  const [mutes, setMutes] = useState<boolean[]>(init._mutes);

  // Create Slot objects
  // Drumhaus has 8 slots
  // Slots contain sampler and params to update the sampler
  const slots: SlotData[] = dhSamplers.map((dhSampler, id) => {
    return {
      id: id,
      name: dhSampler.name,
      sampler: dhSampler,
      volume: volumes[id],
      solo: solos[id],
      mute: mutes[id],
    };
  });

  // Drumhaus Main Control States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);

  // BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Swing
  useEffect(() => {
    Tone.Transport.swing = swing;
  }, [swing]);

  // Set Transport to Play Button

  return (
    <>
      <Center h="100vh">
        <Box w="700px" h="500px" bg="silver">
          <Heading id="logo" variant="logo">
            drumhaus
          </Heading>
          <Grid templateColumns="repeat(8, 1fr)">
            {slots.map((slotData) => (
              <Slot key={slotData.id} data={slotData} />
            ))}
            {/* {samples.map((sample) => (
              <GridItem key={sample.id} colSpan={{ base: 4, lg: 8 }}>
                <Center bg="gray" p={4}>
                  <Button onClick={() => playSample(sample)}>
                    {sample.id}
                  </Button>
                </Center>
              </GridItem>
            ))} */}
          </Grid>

          <Button id="playButton">Play</Button>
        </Box>
      </Center>
    </>
  );
};

export default Drumhaus;
