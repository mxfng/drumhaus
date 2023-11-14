"use client";

import * as init from "@/lib/init";
import { DHSampler, SlotData } from "@/types/types";
import { Box, Button, Center, Grid, GridItem, Heading } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Sequencer } from "./Sequencer";
import { Instruments } from "./Instruments";
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";

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

  const seqRef = useRef<Tone.Sequence | null>(null);

  // Drumhaus core step clock
  useEffect(() => {
    if (isPlaying) {
      seqRef.current = new Tone.Sequence(
        (time, step: number) => {
          console.log(step);
          for (let row = 0; row < sequences.length; row++) {
            const value = sequences[row][step];
            if (value) {
              slots[row].sampler.sampler.triggerRelease("C2");
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

  useEffect(() => {
    console.log(step);
  }, [step]);

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

      <Box h="180px" w="100%">
        <Grid templateColumns="repeat(5,1rem)" w="100%" h="100%" p={4}>
          <GridItem colSpan={1} h="100%" w="fit-content">
            <Center w="100%" h="100%">
              <Button
                h="140px"
                w="140px"
                onClick={() => togglePlay()}
                boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)"
                bg="gray"
              >
                {isPlaying ? (
                  <IoPauseSharp size={50} color="darkorange" />
                ) : (
                  <IoPlaySharp size={50} color="darkorange" />
                )}
              </Button>
            </Center>
          </GridItem>
        </Grid>
      </Box>

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
