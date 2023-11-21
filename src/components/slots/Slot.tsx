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
import {
  Knob,
  transformKnobFilterValue,
  transformKnobValue,
} from "../common/Knob";
import { useEffect, useRef, useState } from "react";
import Waveform from "./Waveform";
import { useSampleDuration } from "@/hooks/useSampleDuration";
import * as Tone from "tone/build/esm/index";
import { MdHeadphones } from "react-icons/md";
import { ImVolumeMute } from "react-icons/im";
import { ImVolumeMute2 } from "react-icons/im";

type SlotParams = {
  color?: string;
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
  bg?: string;
};

export const Slot: React.FC<SlotParams> = ({
  color = "#ff7b00",
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
  ...props
}) => {
  const [attack, setAttack] = useState(attacks[sample.id]);
  const [release, setRelease] = useState(releases[sample.id]);
  const [filter, setFilter] = useState(filters[sample.id]); // 0-100
  const [pan, setPan] = useState(pans[sample.id]);
  const [volume, setVolume] = useState(volumes[sample.id]); // 0-100
  const [waveWidth, setWaveWidth] = useState<number>(200);
  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const sampleDuration = useSampleDuration(sample.sampler, sample.url);

  useEffect(() => {
    const newAttackValue = transformKnobValue(attack, [0, 0.1]);
    sample.envelope.attack = newAttackValue;
  }, [attack, sample.envelope.attack, sample.envelope, sample]);

  useEffect(() => {
    sample.filter.type = filter <= 49 ? "lowpass" : "highpass";
    sample.filter.frequency.value = transformKnobFilterValue(filter);
  }, [
    filter,
    sample.filter,
    sample.filter.frequency.value,
    sample.filter.type,
    sample.sampler,
    sample,
  ]);

  useEffect(() => {
    const newPanValue = transformKnobValue(pan, [-1, 1]);
    sample.panner.pan.value = newPanValue;
  }, [pan, sample.panner.pan, sample]);

  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-46, 4]);
    sample.sampler.volume.value = newVolumeValue;
  }, [volume, sample.sampler.volume, sample]);

  useEffect(() => {
    setAttacks((prevAttacks) => {
      const newAttacks = [...prevAttacks];
      newAttacks[sample.id] = attack;
      return newAttacks;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attack, sample.id, sample]);

  useEffect(() => {
    setReleases((prevReleases) => {
      const newReleases = [...prevReleases];
      newReleases[sample.id] = release;
      return newReleases;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [release, sample.id, sample]);

  useEffect(() => {
    setFilters((prevFilters) => {
      const newFilters = [...prevFilters];
      newFilters[sample.id] = filter;
      return newFilters;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sample.id, sample]);

  useEffect(() => {
    setPans((prevPans) => {
      const newPans = [...prevPans];
      newPans[sample.id] = pan;
      return newPans;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pan, sample.id, sample]);

  useEffect(() => {
    setVolumes((prevVolumes) => {
      const newVolumes = [...prevVolumes];
      newVolumes[sample.id] = volume;
      return newVolumes;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, sample.id, sample]);

  useEffect(() => {
    setDurations((prevDurations) => {
      const newDurations = [...prevDurations];
      newDurations[sample.id] = sampleDuration;
      return newDurations;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleDuration, sample]);

  useEffect(() => {
    setAttack(attacks[sample.id]);
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample]);

  useEffect(() => {
    setRelease(releases[sample.id]);
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample]);

  useEffect(() => {
    setFilter(filters[sample.id]);
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample]);

  useEffect(() => {
    setPan(pans[sample.id]);
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample]);

  useEffect(() => {
    setVolume(volumes[sample.id]);
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample]);

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
      if (newMutes[slot]) {
        sample.sampler.triggerRelease("C2", Tone.now());
      }
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
      <Box
        w="100%"
        key={`Slot-${sample.name}`}
        py={4}
        position="relative"
        transition="all 0.5s ease-in-out"
        mt={2}
        _hover={{
          "& .wavebutton": {
            opacity: 1,
          },
        }}
        {...props}
      >
        <Flex px={4}>
          <Text pr={2} color={color} fontWeight={900}>
            {sample.id + 1}
          </Text>
          <Text fontWeight={600} color="brown">
            {sample.name}
          </Text>
        </Flex>
        {/* <Text
          key={`filename-${sample.name}`}
          className="filename"
          fontFamily={`'Pixelify Sans Variable', sans-serif`}
          color="#B09374"
          px={4}
          py={2}
        >
          {sample.url.split("/").pop()}
        </Text> */}
        <Box px={4} pt={5}>
          <Button
            ref={waveButtonRef}
            w="100%"
            h="60px"
            onMouseDown={() => playSample()}
            bg="transparent"
            opacity={0.8}
            className="wavebutton"
          >
            <Waveform audioFile={sample.url} width={waveWidth} />
          </Button>
        </Box>

        <Grid templateColumns="repeat(2, 1fr)" p={1}>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-attack`}
              size={50}
              knobValue={attack}
              setKnobValue={setAttack}
              knobTitle="ATTACK"
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-filter`}
              size={50}
              knobValue={filter}
              setKnobValue={setFilter}
              knobTitle="FILTER"
              filter={true}
              exponential={true}
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-release`}
              size={50}
              knobValue={release}
              setKnobValue={setRelease}
              knobTitle="RELEASE"
            />
          </GridItem>

          <GridItem>
            <Knob
              key={`knob-${sample.id}-pans`}
              size={50}
              knobValue={pan}
              setKnobValue={setPan}
              knobTitle="PAN"
              knobTransformRange={[-100, 100]}
            />
          </GridItem>
          <GridItem w="100%">
            <Center h="100%" w="100%">
              <Flex
                boxShadow="0 2px 4px rgba(176, 147, 116, 0.6)"
                borderRadius="8px"
              >
                <Button
                  title="Mute"
                  h="30px"
                  w="30px"
                  bg="transparent"
                  borderRadius="8px 0 0 8px"
                  p="0px"
                  onClick={() => toggleMute(sample.id)}
                  className="raised"
                >
                  {mutes[sample.id] ? (
                    <ImVolumeMute2 color="#B09374" />
                  ) : (
                    <ImVolumeMute color="#B09374" />
                  )}
                </Button>
                <Button
                  title="Solo"
                  h="30px"
                  w="30px"
                  bg="transparent"
                  borderRadius="0 8px 8px 0"
                  p="0px"
                  onClick={() => toggleSolo(sample.id)}
                  className="raised"
                >
                  <MdHeadphones
                    color={solos[sample.id] ? "darkorange" : "B09374"}
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
