"use client";

import * as init from "@/lib/init";
import { DHSampler, SlotData } from "@/types/types";
import { Box, Button, Center, Grid, GridItem, Heading } from "@chakra-ui/react";
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
    <Box
      id="Drumhaus"
      className="drumhaus"
      bg="silver"
      h="100vh"
      overflow="hidden"
    >
      <Heading
        id="logo"
        variant="logo"
        as="h1"
        fontSize={100}
        color="darkorange"
      >
        drumhaus
      </Heading>
      <Grid key="slots" templateColumns="repeat(8, 1fr)">
        {slots.map((slotData, i) => (
          <GridItem key={`gridItem-${slotData.id}`} position="relative">
            <Slot key={`DHSlot-${slotData.id}`} data={slotData} />
          </GridItem>
        ))}
      </Grid>

      <Button id="playButton">Play</Button>
    </Box>
  );
};

export default Drumhaus;
