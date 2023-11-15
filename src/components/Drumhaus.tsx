"use client";

import * as init from "@/lib/init";
import { DHSampler, SlotData } from "@/types/types";
import { Box, Button, Center, Grid, GridItem, Heading } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Sequencer } from "./Sequencer";
import { Instruments } from "./Instruments";
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import { TransportControl } from "./TransportControl";
import { transformKnobValue } from "./Knob";

const Drumhaus = () => {
  // Provide state array of Drumhaus samplers
  const [dhSamplers, setDhSamplers] = useState<DHSampler[]>(init._dhSamplers);

  // Provide state arrays of slot paramters
  const [volumes, setVolumes] = useState<number[]>(init._volumes);
  const [attacks, setAttacks] = useState<number[]>(init._attacks);
  const [releases, setReleases] = useState<number[]>(init._releases);
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
      attack: attacks[id],
      release: releases[id],
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
    const newSwing = transformKnobValue(swing, [0, 0.5]);
    Tone.Transport.swing = newSwing;
  }, [swing]);

  const [slot, setSlot] = useState<number>(0);

  const [sequences, setSequences] = useState<boolean[][]>(
    Array(8).fill(Array(16).fill(false))
  );

  const [currentSequence, setCurrentSequence] = useState<boolean[]>(
    sequences[slot]
  );

  const seqRef = useRef<Tone.Sequence | null>(null);

  // Drumhaus core step clock
  useEffect(() => {
    if (isPlaying) {
      seqRef.current = new Tone.Sequence(
        (time, step: number) => {
          for (let row = 0; row < sequences.length; row++) {
            const value = sequences[row][step];
            if (value) {
              // Mute OHat on Hat hits
              if (row == 4) {
                slots[5].sampler.sampler.triggerRelease("C2", time);
              }
              slots[row].sampler.sampler.triggerRelease("C2", time);
              slots[row].sampler.sampler.triggerAttack("C2", time);
            }

            setStep(step);
          }
        },
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        "16n"
      ).start(0);
    }

    return () => {
      seqRef.current?.dispose();
    };
  }, [slots, sequences, isPlaying]);

  const togglePlay = async () => {
    await Tone.start();

    setIsPlaying((prevIsPlaying) => {
      const newIsPlaying = !prevIsPlaying;

      if (newIsPlaying) {
        Tone.Transport.start();
      } else {
        Tone.Transport.stop();
      }

      return newIsPlaying;
    });
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Check if the pressed key is the space bar
    if (event.key === " ") {
      togglePlay();
    }
  };

  // Attach the event listener when the component mounts
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Remove the event listener when the component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <Box
      id="Drumhaus"
      className="drumhaus"
      bg="silver"
      minW={900}
      style={{ userSelect: "none" }}
    >
      <Box boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)" my={4}>
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
      </Box>

      <Box boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)">
        <Instruments
          slots={slots}
          sequences={sequences}
          setCurrentSequence={setCurrentSequence}
          slot={slot}
          setSlot={setSlot}
        />
      </Box>

      <Grid templateColumns="repeat(5, 1fr)" p={4}>
        <GridItem colSpan={1} h="160px" w="160px">
          <Center w="100%" h="100%">
            <Button
              h="140px"
              w="140px"
              onClick={() => togglePlay()}
              boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)"
              bg="silver"
              outline="none"
            >
              {isPlaying ? (
                <IoPauseSharp size={50} color="darkorange" />
              ) : (
                <IoPlaySharp size={50} color="darkorange" />
              )}
            </Button>
          </Center>
        </GridItem>

        <GridItem colSpan={1}>
          <TransportControl
            bpm={bpm}
            setBpm={setBpm}
            swing={swing}
            setSwing={setSwing}
          />
        </GridItem>
      </Grid>

      <Box p={8} boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)">
        <Sequencer
          sequence={currentSequence}
          setSequence={setCurrentSequence}
          sequences={sequences}
          setSequences={setSequences}
          slot={slot}
          step={step}
        />
      </Box>
    </Box>
  );
};

export default Drumhaus;
