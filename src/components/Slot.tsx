"use client";

import { Sample } from "@/types/types";
import { Box, Button, Grid, GridItem, Heading, Text } from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import { Knob, transformKnobValue } from "./Knob";
import { useEffect, useRef, useState } from "react";
import Waveform from "./Waveform";
import { useSampleDuration } from "@/hooks/useSampleDuration";
import { KnobFilter, transformKnobFilterValue } from "./KnobFilter";

type SlotParams = {
  sample: Sample;
  attacks: number[];
  setAttacks: React.Dispatch<React.SetStateAction<number[]>>;
  releases: number[];
  setReleases: React.Dispatch<React.SetStateAction<number[]>>;
  filters: number[];
  setFilters: React.Dispatch<React.SetStateAction<number[]>>;
  volumes: number[];
  setVolumes: React.Dispatch<React.SetStateAction<number[]>>;
};

export const Slot: React.FC<SlotParams> = ({
  sample,
  attacks,
  setAttacks,
  releases,
  setReleases,
  filters,
  setFilters,
  volumes,
  setVolumes,
}) => {
  const [attack, setAttack] = useState(attacks[sample.id]);
  const [release, setRelease] = useState(releases[sample.id]);
  const [filter, setFilter] = useState(filters[sample.id]); // 0-100
  const [volume, setVolume] = useState(volumes[sample.id]); // 0-100
  const [waveWidth, setWaveWidth] = useState<number>(200);
  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const sampleDuration = useSampleDuration(sample.sampler, sample.url);

  useEffect(() => {
    const newAttackValue = transformKnobValue(attack, [0, 1]);
    sample.sampler.attack = newAttackValue;
  }, [attack, sample.sampler.attack, sample.sampler]);

  useEffect(() => {
    sample.filter.type = filter <= 49 ? "lowpass" : "highpass";
    sample.filter.frequency.value = transformKnobFilterValue(filter);
  }, [
    filter,
    sample.filter,
    sample.filter.frequency.value,
    sample.filter.type,
    sample.sampler,
  ]);

  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-30, 0]);
    sample.sampler.volume.value = newVolumeValue;
  }, [volume, sample.sampler.volume]);

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
    setAttacks((prevAttacks) => {
      const newAttacks = [...prevAttacks];
      newAttacks[sample.id] = attack;
      return newAttacks;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attack, sample.id]);

  useEffect(() => {
    setReleases((prevReleases) => {
      const newReleases = [...prevReleases];
      newReleases[sample.id] = release;
      return newReleases;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [release, sample.id]);

  useEffect(() => {
    setFilters((prevFilters) => {
      const newFilters = [...prevFilters];
      newFilters[sample.id] = filter;
      return newFilters;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sample.id]);

  useEffect(() => {
    setVolumes((prevVolumes) => {
      const newVolumes = [...prevVolumes];
      newVolumes[sample.id] = volume;
      return newVolumes;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, sample.id]);

  const playSample = () => {
    sample.sampler.triggerRelease("C2");
    sample.sampler.triggerAttackRelease(
      "C2",
      transformKnobValue(release, [0.0001, sampleDuration])
    );
  };

  return (
    <>
      <Box w="100%" key={`Slot-${sample.name}`} p={4}>
        <Heading className="slot" as="h2">
          {sample.name}
        </Heading>
        <Text
          key={`filename-${sample.name}`}
          className="filename"
          fontFamily={`'Pixelify Sans Variable', sans-serif`}
          color="gray"
        >
          {sample.url.split("/").pop()}
        </Text>
        <Button
          ref={waveButtonRef}
          w="100%"
          h="60px"
          onMouseDown={() => playSample()}
          bg="transparent"
        >
          <Waveform audioFile={sample.url} width={waveWidth} />
        </Button>

        <Grid templateColumns="repeat(2, 1fr)">
          <GridItem>
            <Knob
              key={`knob-${sample.id}-attack`}
              size={60}
              knobValue={attack}
              setKnobValue={setAttack}
              knobTitle="ATTACK"
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-release`}
              size={60}
              knobValue={release}
              setKnobValue={setRelease}
              knobTitle="RELEASE"
            />
          </GridItem>
          <GridItem>
            <KnobFilter
              key={`knob-${sample.id}-filter`}
              size={60}
              knobValue={filter}
              setKnobValue={setFilter}
              knobTitle="FILTER"
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-volume`}
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
      {sample.id > 0 ? (
        <Box
          key={`line-${sample.id}`}
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
