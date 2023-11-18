"use client";

import { Sample } from "@/types/types";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Text,
} from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import { Knob, transformKnobValue } from "./Knob";
import { useEffect, useRef, useState } from "react";
import Waveform from "./Waveform";
import { useSampleDuration } from "@/hooks/useSampleDuration";
import { KnobFilter, transformKnobFilterValue } from "./KnobFilter";
import * as Tone from "tone/build/esm/index";
import { MdHeadphones } from "react-icons/md";
import { ImVolumeMute } from "react-icons/im";
import { ImVolumeMute2 } from "react-icons/im";

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
  pans: number[];
  setPans: React.Dispatch<React.SetStateAction<number[]>>;
  mutes: boolean[];
  setMutes: React.Dispatch<React.SetStateAction<boolean[]>>;
  solos: boolean[];
  setSolos: React.Dispatch<React.SetStateAction<boolean[]>>;
  setDurations: React.Dispatch<React.SetStateAction<number[]>>;
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
  pans,
  setPans,
  mutes,
  setMutes,
  solos,
  setSolos,
  setDurations,
}) => {
  const [attack, setAttack] = useState(attacks[sample.id]);
  const [release, setRelease] = useState(releases[sample.id]);
  const [filter, setFilter] = useState(filters[sample.id]); // 0-100
  const [pan, setPan] = useState(pans[sample.id]);
  const [volume, setVolume] = useState(volumes[sample.id]); // 0-100
  const [waveWidth, setWaveWidth] = useState<number>(200);
  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const sampleDuration = useSampleDuration(sample.sampler, sample.url);
  const [isBrowsing, setIsBrowsing] = useState(false);

  useEffect(() => {
    const newAttackValue = transformKnobValue(attack, [0, 0.1]);
    sample.envelope.attack = newAttackValue;
  }, [attack, sample.envelope.attack, sample.envelope]);

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
    const newPanValue = transformKnobValue(pan, [-1, 1]);
    sample.panner.pan.value = newPanValue;
  }, [pan, sample.panner.pan]);

  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-46, 4]);
    sample.sampler.volume.value = newVolumeValue;
  }, [volume, sample.sampler.volume]);

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
    setPans((prevPans) => {
      const newPans = [...prevPans];
      newPans[sample.id] = pan;
      return newPans;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan, sample.id]);

  useEffect(() => {
    setVolumes((prevVolumes) => {
      const newVolumes = [...prevVolumes];
      newVolumes[sample.id] = volume;
      return newVolumes;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, sample.id]);

  useEffect(() => {
    setDurations((prevDurations) => {
      const newDurations = [...prevDurations];
      newDurations[sample.id] = sampleDuration;
      return newDurations;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleDuration]);

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

  const toggleMute = (slot: number) => {
    setMutes((prevMutes) => {
      const newMutes = [...prevMutes];
      newMutes[slot] = !newMutes[slot];
      return newMutes;
    });
  };

  const toggleSolo = (slot: number) => {
    setSolos((prevSolos) => {
      const newSolos = [...prevSolos];
      newSolos[slot] = !newSolos[slot];
      return newSolos;
    });
  };

  const playSample = () => {
    const time = Tone.now();
    sample.sampler.triggerRelease("C2", time);
    sample.envelope.triggerAttack(time);
    sample.envelope.triggerRelease(
      time + transformKnobValue(release, [0, sampleDuration])
    );
    sample.sampler.triggerAttack("C2", time);
  };

  return (
    <>
      <Box w="100%" key={`Slot-${sample.name}`} p={4} position="relative">
        <Flex>
          <Text pr={2} color="darkorange" fontWeight={900}>
            {sample.id + 1}
          </Text>
          <Text fontWeight={600} color="black">
            {sample.name}
          </Text>
        </Flex>
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
              key={`knob-${sample.id}-release`}
              size={60}
              knobValue={release}
              setKnobValue={setRelease}
              knobTitle="RELEASE"
            />
          </GridItem>

          <GridItem>
            <Knob
              key={`knob-${sample.id}-pans`}
              size={60}
              knobValue={pan}
              setKnobValue={setPan}
              knobTitle="PAN"
              knobTransformRange={[-100, 100]}
            />
          </GridItem>
          <GridItem>
            <Center h="100%" w="100%">
              <Flex boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)" borderRadius="8px">
                <Button
                  h="30px"
                  w="30px"
                  bg="transparent"
                  borderRadius="8px 0 0 8px"
                  p="0px"
                  onClick={() => toggleMute(sample.id)}
                >
                  {mutes[sample.id] ? (
                    <ImVolumeMute2 color="gray" />
                  ) : (
                    <ImVolumeMute color="gray" />
                  )}
                </Button>
                <Button
                  h="30px"
                  w="30px"
                  bg="transparent"
                  borderRadius="0 8px 8px 0"
                  p="0px"
                  onClick={() => toggleSolo(sample.id)}
                >
                  <MdHeadphones
                    color={solos[sample.id] ? "darkorange" : "gray"}
                  />
                </Button>
              </Flex>
            </Center>
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-volume`}
              size={60}
              knobValue={volume}
              setKnobValue={setVolume}
              knobTitle="VOLUME"
              knobTransformRange={[-46, 4]}
              knobUnits="dB"
            />
          </GridItem>
        </Grid>
      </Box>
    </>
  );
};
