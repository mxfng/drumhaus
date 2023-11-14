"use client";

import * as init from "@/lib/init";
import { DHSampler, SlotData } from "@/types/types";
import { Box, Button, Heading } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Sequencer } from "./Sequencer";
import { Instruments } from "./Instruments";

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
  const [bpm, setBpm] = useState(70);
  const [swing, setSwing] = useState(0);
  const [step, setStep] = useState(0);

  // BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Swing
  useEffect(() => {
    Tone.Transport.swing = swing;
  }, [swing]);

  const [slot, setSlot] = useState<number>(0);

  const [sequences, setSequences] = useState<boolean[][]>(
    Array(8).fill(Array(16).fill(false))
  );

  const [currentSequence, setCurrentSequence] = useState<boolean[]>(
    sequences[slot]
  );

  const togglePlay = async () => {
    await Tone.start();
    console.log("Tone is ready");

    if (!isPlaying) {
      setIsPlaying(true);
      Tone.Transport.start();
    } else {
      setIsPlaying(false);
      Tone.Transport.stop();
    }
  };

  return (
    <Box
      id="Drumhaus"
      className="drumhaus"
      bg="silver"
      w="100%"
      h="100%"
      position="relative"
      style={{ userSelect: "none" }}
    >
      <Heading
        id="logo"
        variant="logo"
        as="h1"
        fontSize={100}
        color="darkorange"
        fontFamily="Mandala"
      >
        drumhaus
      </Heading>
      <Box w="100%" h="8px" bg="gray" />
      <Instruments
        slots={slots}
        sequences={sequences}
        setCurrentSequence={setCurrentSequence}
        slot={slot}
        setSlot={setSlot}
      />
      <Box w="100%" h="2px" bg="gray" />
      <Box h="100px">
        <Button onClick={() => togglePlay()}>
          {isPlaying ? "PAUSE" : "PLAY"}
        </Button>
      </Box>
      <Box w="100%" h="2px" bg="gray" />
      <Box p={8}>
        <Sequencer
          sequence={currentSequence}
          setSequence={setCurrentSequence}
          sequences={sequences}
          setSequences={setSequences}
          slot={slot}
          step={step}
        />
      </Box>
      <Box w="100%" h="8px" bg="gray" />
    </Box>
  );
};

export default Drumhaus;
