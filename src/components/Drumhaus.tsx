"use client";

import * as init from "@/lib/init";
import { SlotData } from "@/types/types";
import { Box, Button, Center, Grid, GridItem, Heading } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Sequencer } from "./Sequencer";
import { SlotsGrid } from "./SlotsGrid";
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import { TransportControl } from "./TransportControl";
import { transformKnobValue } from "./Knob";
import { useSampleDuration } from "@/hooks/useSampleDuration";

const Drumhaus = () => {
  const slots: SlotData[] = init._samples.map((sample, id) => {
    return {
      id: id,
      sample: sample,
      volume: init._volumes[id],
      attack: init._attacks[id],
      release: init._releases[id],
      solo: init._solos[id],
      mute: init._mutes[id],
    };
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [slotIndex, setSlotIndex] = useState<number>(0);

  const [sequences, setSequences] = useState<boolean[][]>(init._sequences);
  const [currentSequence, setCurrentSequence] = useState<boolean[]>(
    init._sequences[slotIndex]
  );
  const [bpm, setBpm] = useState(init._bpm);
  const [swing, setSwing] = useState(init._swing);
  const [releases, setReleases] = useState<number[]>(init._releases);
  const sampleDurations = slots.map((slot) => {
    return useSampleDuration(slot.sample.sampler, slot.sample.url);
  });

  const toneSequence = useRef<Tone.Sequence | null>(null);

  useEffect(() => {
    if (isPlaying) {
      toneSequence.current = new Tone.Sequence(
        (time, step: number) => {
          function triggerSample(row: number) {
            slots[row].sample.sampler.triggerRelease("C2", time);
            slots[row].sample.sampler.triggerAttackRelease(
              "C2",
              transformKnobValue(releases[row], [0.0001, sampleDurations[row]]),
              time
            );
          }

          function muteOHatOnHat(row: number) {
            if (row == 4) slots[5].sample.sampler.triggerRelease("C2", time);
          }

          for (let row = 0; row < sequences.length; row++) {
            const value = sequences[row][step];
            if (value) {
              muteOHatOnHat(row);
              triggerSample(row);
            }
            setStepIndex(step);
          }
        },
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        "16n"
      ).start(0);
    }

    return () => {
      toneSequence.current?.dispose();
    };
  }, [slots, sequences, isPlaying, sampleDurations]);

  useEffect(() => {
    const playViaSpacebar = (event: KeyboardEvent) => {
      if (event.key === " ") togglePlay();
    };

    document.addEventListener("keydown", playViaSpacebar);

    return () => {
      document.removeEventListener("keydown", playViaSpacebar);
    };
  }, []);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    const newSwing = transformKnobValue(swing, [0, 0.5]);
    Tone.Transport.swing = newSwing;
  }, [swing]);

  const togglePlay = async () => {
    await Tone.start();

    setIsPlaying((prevIsPlaying) => {
      if (!prevIsPlaying) Tone.Transport.start();
      else Tone.Transport.stop();
      return !prevIsPlaying;
    });
  };

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
        <SlotsGrid
          slots={slots}
          sequences={sequences}
          setCurrentSequence={setCurrentSequence}
          slotIndex={slotIndex}
          setSlotIndex={setSlotIndex}
          setReleases={setReleases}
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

        <GridItem colSpan={1} w="100%">
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
          slot={slotIndex}
          step={stepIndex}
          isPlaying={isPlaying}
        />
      </Box>
    </Box>
  );
};

export default Drumhaus;
