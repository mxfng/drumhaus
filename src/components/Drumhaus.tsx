"use client";

import * as init from "@/lib/init";
import { Sample, Sequences } from "@/types/types";
import { Box, Button, Center, Grid, GridItem, Heading } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Sequencer } from "./Sequencer";
import { SlotsGrid } from "./SlotsGrid";
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import { TransportControl } from "./TransportControl";
import { Knob, transformKnobValue } from "./Knob";
import { SequencerControl } from "./SequencerControl";

const Drumhaus = () => {
  const samples: Sample[] = init._samples;

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState(0); // 0 - 15
  const [slotIndex, setSlotIndex] = useState<number>(0); // 0-7
  const [variation, setVariation] = useState<number>(0); // A = 0, B = 1

  // Global
  const [sequences, setSequences] = useState<Sequences>(init._sequences);

  const [currentSequence, setCurrentSequence] = useState<boolean[]>(
    init._sequences[slotIndex][variation][0]
  );
  const [bpm, setBpm] = useState(init._bpm);
  const [swing, setSwing] = useState(init._swing);
  const [masterVolume, setMasterVolume] = useState(init._masterVolume);

  // Slots - prop drilling (consider Redux in the future)
  const [attacks, setAttacks] = useState<number[]>(init._attacks);
  const [releases, setReleases] = useState<number[]>(init._releases);
  const [filters, setFilters] = useState<number[]>(init._filters);
  const [volumes, setVolumes] = useState<number[]>(init._volumes);
  const [pans, setPans] = useState<number[]>(init._pans);
  const [durations, setDurations] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0,
  ]);

  const toneSequence = useRef<Tone.Sequence | null>(null);

  useEffect(() => {
    if (isPlaying) {
      toneSequence.current = new Tone.Sequence(
        (time, step: number) => {
          function triggerSample(slot: number, velocity: number) {
            samples[slot].sampler.triggerRelease("C2", time);
            if (samples[slot].name !== "OHat") {
              samples[slot].sampler.triggerRelease("C2", time);
              samples[slot].envelope.triggerAttack(time);
              samples[slot].envelope.triggerRelease(
                time + transformKnobValue(releases[slot], [0, durations[slot]])
              );
              samples[slot].sampler.triggerAttack("C2", time, velocity);
            } else {
              triggerOHat(velocity);
            }
          }

          function muteOHatOnHat(slot: number) {
            if (slot == 4) samples[5].sampler.triggerRelease("C2", time);
          }

          function triggerOHat(velocity: number) {
            samples[5].envelope.triggerAttack(time);
            samples[5].sampler.triggerAttack("C2", time, velocity);
          }

          for (let slot = 0; slot < sequences.length; slot++) {
            const hit: boolean = sequences[slot][variation][0][step];
            if (hit) {
              const velocity: number = sequences[slot][variation][1][step];
              muteOHatOnHat(slot);
              triggerSample(slot, velocity);
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
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequences, isPlaying, releases]);

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
    Tone.Transport.swingSubdivision = "16n";
    Tone.Transport.swing = newSwing;
  }, [swing]);

  useEffect(() => {
    const newMasterVolume = transformKnobValue(masterVolume, [-46, 4]);
    Tone.Destination.volume.value = newMasterVolume;
  }, [masterVolume]);

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
      maxW={1538}
      style={{ userSelect: "none" }}
      borderRadius="12px"
    >
      <Box boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)" my={4}>
        <Heading
          id="logo"
          variant="logo"
          as="h1"
          fontSize={100}
          color="darkorange"
          fontFamily="Mandala"
          px={6}
        >
          drumhaus
        </Heading>
      </Box>

      <Box boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)">
        <SlotsGrid
          samples={samples}
          variation={variation}
          sequences={sequences}
          setCurrentSequence={setCurrentSequence}
          slotIndex={slotIndex}
          setSlotIndex={setSlotIndex}
          attacks={attacks}
          setAttacks={setAttacks}
          releases={releases}
          setReleases={setReleases}
          filters={filters}
          setFilters={setFilters}
          volumes={volumes}
          setVolumes={setVolumes}
          pans={pans}
          setPans={setPans}
          setDurations={setDurations}
        />
      </Box>

      <Grid templateColumns="repeat(4, 1fr)" p={4} w="100%">
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
          <SequencerControl />
        </GridItem>

        <GridItem colSpan={1} w="100%">
          <TransportControl
            bpm={bpm}
            setBpm={setBpm}
            swing={swing}
            setSwing={setSwing}
          />
        </GridItem>
        <GridItem colSpan={1} w="100%">
          <Knob
            size={140}
            knobValue={masterVolume}
            setKnobValue={setMasterVolume}
            knobTitle="MASTER VOLUME"
            knobTransformRange={[-46, 4]}
            knobUnits="dB"
          />
        </GridItem>
      </Grid>

      <Box p={8} boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)">
        <Sequencer
          sequence={currentSequence}
          setSequence={setCurrentSequence}
          sequences={sequences}
          variation={variation}
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
