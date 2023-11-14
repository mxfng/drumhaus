"use client";

import { SlotData } from "@/types/types";
import {
  Box,
  Button,
  Center,
  Grid,
  GridItem,
  Heading,
  Text,
} from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import { Knob } from "./Knob";
import { useEffect, useRef, useState } from "react";
import Waveform from "./Waveform";
import * as Tone from "tone/build/esm/index";

type SlotParams = {
  data: SlotData;
};

export const Slot: React.FC<SlotParams> = ({ data }) => {
  const [volume, setVolume] = useState(90); // 0-100
  const [attack, setAttack] = useState(0);
  const [release, setRelease] = useState(100);
  const [sampleDuration, setSampleDuration] = useState(0);

  const [waveWidth, setWaveWidth] = useState<number>(100);

  // Control attack
  useEffect(() => {
    const newAttackValue = transformKnobValue(attack, [0, 1]);
    data.sampler.sampler.attack = newAttackValue;
  }, [attack, data.sampler.sampler.attack, data.sampler.sampler]);

  // Control volume
  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-30, 0]);
    data.sampler.sampler.volume.value = newVolumeValue;
  }, [volume, data.sampler.sampler.volume]);

  // Resize audio waveform to button size
  useEffect(() => {
    const handleResize = () => {
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

  // Fetch sample duration
  useEffect(() => {
    const fetchAudioDuration = async () => {
      try {
        const buffer = await Tone.Buffer.fromUrl(
          `/samples/${data.sampler.url}`
        );
        const durationInSeconds = buffer.duration;
        return durationInSeconds;
      } catch (error) {
        console.error("Error fetching or decoding audio data:", error);
        return 0;
      }
    };

    const updateSampleDuration = async () => {
      const duration = await fetchAudioDuration();
      setSampleDuration(duration);
    };

    updateSampleDuration();
  }, [data.sampler.sampler, data.sampler.url]);

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
    data.sampler.sampler.triggerRelease("C2");
    data.sampler.sampler.triggerAttackRelease(
      "C2",
      transformKnobValue(release, [0.0001, sampleDuration])
    );
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
          bg="rgba(255, 255, 255, 0.1)"
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
              knobTitle="ATTACK"
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${data.name}-release`}
              size={60}
              knobValue={release}
              setKnobValue={setRelease}
              knobTitle="RELEASE"
            />
          </GridItem>
          <GridItem />
          <GridItem>
            <Knob
              key={`knob-${data.name}-volume`}
              size={60}
              knobValue={volume}
              setKnobValue={setVolume}
              knobTitle="VOLUME"
            />
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
