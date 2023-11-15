"use client";

import { SlotData } from "@/types/types";
import { Box, Button, Grid, GridItem, Heading, Text } from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import { Knob, transformKnobValue } from "./Knob";
import { useEffect, useRef, useState } from "react";
import Waveform from "./Waveform";
import * as Tone from "tone/build/esm/index";

type SlotParams = {
  data: SlotData;
};

export const Slot: React.FC<SlotParams> = ({ data }) => {
  const [volume, setVolume] = useState(data.volume); // 0-100
  const [attack, setAttack] = useState(data.attack);
  const [release, setRelease] = useState(data.release);
  const [waveWidth, setWaveWidth] = useState<number>(200);
  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const [sampleDuration, setSampleDuration] = useState(0);

  useEffect(() => {
    const newAttackValue = transformKnobValue(attack, [0, 1]);
    data.sampler.sampler.attack = newAttackValue;
  }, [attack, data.sampler.sampler.attack, data.sampler.sampler]);

  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-30, 0]);
    data.sampler.sampler.volume.value = newVolumeValue;
  }, [volume, data.sampler.sampler.volume]);

  useEffect(() => {
    const maintainWaveformSize = () => {
      if (waveButtonRef.current) {
        setWaveWidth(waveButtonRef.current.clientWidth);
      }
    };

    window.addEventListener("resize", maintainWaveformSize);
    maintainWaveformSize();

    return () => {
      window.removeEventListener("resize", maintainWaveformSize);
    };
  }, []);

  useEffect(() => {
    const fetchSampleDuration = async () => {
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
      const duration = await fetchSampleDuration();
      setSampleDuration(duration);
    };

    updateSampleDuration();
  }, [data.sampler.sampler, data.sampler.url]);

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
          fontFamily={`'Pixelify Sans Variable', sans-serif`}
          color="gray"
        >
          {data.sampler.url.split("/").pop()}
        </Text>
        <Button
          ref={waveButtonRef}
          w="100%"
          h="60px"
          onMouseDown={() => playSample()}
          bg="transparent"
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
              knobTransformRange={[-30, 0]}
              knobUnits="dB"
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
