"use client";

import { SlotData } from "@/types/types";
import { Box, Button, Grid, GridItem, Heading, Text } from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import { Knob } from "./Knob";
import { useEffect, useRef, useState } from "react";
import WaveformVisualizer from "./Waveform";
import Waveform from "./Waveform";

type SlotParams = {
  data: SlotData;
};

export const Slot: React.FC<SlotParams> = ({ data }) => {
  const [volume, setVolume] = useState(90); // 0-100
  const [attack, setAttack] = useState(0);
  const [release, setRelease] = useState(0);

  const [waveWidth, setWaveWidth] = useState<number>(100);

  // Control attack
  useEffect(() => {
    const newAttackValue = transformKnobValue(attack, [0, 1]);
    data.sampler.sampler.attack = newAttackValue;
  });

  // Control attack
  useEffect(() => {
    const newReleaseValue = transformKnobValue(release, [0, 1]);
    data.sampler.sampler.release = newReleaseValue;
  });

  // Control volume
  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-30, 0]);
    data.sampler.sampler.volume.value = newVolumeValue;
  }, [volume]);

  useEffect(() => {
    const handleResize = () => {
      // Get the width of the button ID
      if (waveButtonRef.current) {
        setWaveWidth(waveButtonRef.current.clientWidth);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Transform knob values (0-100) to any Tone.js parameter range [min, max]
  const transformKnobValue = (
    input: number,
    range: [number, number]
  ): number => {
    const [newRangeMin, newRangeMax] = range;
    const scalingFactor = (newRangeMax - newRangeMin) / 100;
    return scalingFactor * input + newRangeMin;
  };

  const waveButtonRef = useRef<HTMLButtonElement>(null);

  const playSample = () => {
    data.sampler.sampler.triggerAttack("C2");
  };

  return (
    <>
      <Box w="100%" key={`Slot-${data.name}`} p={4}>
        <Heading className="slot" as="h2">
          {data.name}
        </Heading>
        <Text
          key={`filename-${data.name}`}
          className="filename"
          css={{
            fontFamily: `'Pixelify Sans Variable', sans-serif`,
          }}
        >
          {data.sampler.url.split("/").pop()}
        </Text>
        <Button
          ref={waveButtonRef}
          w="100%"
          h="60px"
          onClick={() => playSample()}
          m={2}
          bg="gray"
        >
          <Waveform audioFile={data.sampler.url} width={waveWidth} />
        </Button>

        <Grid templateColumns="repeat(2, 1fr)">
          <GridItem>
            <Knob
              key={`knob-${data.name}-attack`}
              size={60}
              knobValue={attack}
              setKnobValue={setAttack}
            />
            <Text>Attack: {attack}</Text>
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${data.name}-release`}
              size={60}
              knobValue={release}
              setKnobValue={setRelease}
            />
            <Text>Release: {release}</Text>
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${data.name}-volume`}
              size={60}
              knobValue={volume}
              setKnobValue={setVolume}
            />
            <Text>Volume: {volume}</Text>
          </GridItem>
        </Grid>
      </Box>

      {/* Divider Line */}
      {data.id > 0 ? (
        <Box
          key={`line-${data.id}`}
          bg="gray"
          w="2px"
          h="100%"
          position="absolute"
          left={0}
          top={0}
        />
      ) : null}
    </>
  );
};
