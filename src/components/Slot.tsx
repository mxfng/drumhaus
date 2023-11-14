"use client";

import { SlotData } from "@/types/types";
import { Box, Button, Heading, Text } from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import { Knob } from "./Knob";
import { useEffect, useState } from "react";
import WaveformVisualizer from "./Waveform";
import Waveform from "./Waveform";

type SlotParams = {
  data: SlotData;
};

export const Slot: React.FC<SlotParams> = ({ data }) => {
  const playSample = () => {
    data.sampler.sampler.triggerAttack("C2");
  };

  // Control volume
  const [volume, setVolume] = useState(90); // 0-100

  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-30, 0]);
    data.sampler.sampler.volume.value = newVolumeValue;
  }, [volume]);

  // Transform knob values (0-100) to any Tone.js parameter range [min, max]
  const transformKnobValue = (
    input: number,
    range: [number, number]
  ): number => {
    const [newRangeMin, newRangeMax] = range;
    const scalingFactor = (newRangeMax - newRangeMin) / 100;
    return scalingFactor * input + newRangeMin;
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
          {data.sampler.url}
        </Text>
        <Button onClick={() => playSample()} m={2} />
        <Waveform audioFile={data.sampler.url} />
        <Knob
          key={`knob1-${data.name}`}
          size={60}
          knobValue={volume}
          setKnobValue={setVolume}
        />
        <Text>{volume}</Text>
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
