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
  Tooltip,
} from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import {
  Knob,
  transformKnobFilterValue,
  transformKnobValue,
} from "../common/Knob";
import { useCallback, useEffect, useRef, useState } from "react";
import Waveform from "./Waveform";
import { useSampleDuration } from "@/hooks/useSampleDuration";
import * as Tone from "tone/build/esm/index";
import { MdHeadphones } from "react-icons/md";
import { ImVolumeMute } from "react-icons/im";
import { ImVolumeMute2 } from "react-icons/im";
import { CustomSlider } from "../common/CustomSlider";

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
  pitches: number[];
  setPitches: React.Dispatch<React.SetStateAction<number[]>>;
  setDurations: React.Dispatch<React.SetStateAction<number[]>>;
  bg?: string;
  isModal: boolean;
  slotIndex: number;
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
  pitches,
  setPitches,
  setDurations,
  isModal,
  slotIndex,
  ...props
}) => {
  const [attack, setAttack] = useState(attacks[sample.id]);
  const [release, setRelease] = useState(releases[sample.id]);
  const [filter, setFilter] = useState(filters[sample.id]); // 0-100
  const [pan, setPan] = useState(pans[sample.id]);
  const [volume, setVolume] = useState(volumes[sample.id]); // 0-100
  const [pitch, setPitch] = useState(pitches[sample.id]);
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
    setPitches((prevPitches) => {
      const newPitches = [...prevPitches];
      newPitches[sample.id] = pitch;
      return newPitches;
    });
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitch, sample.id, sample]);

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
    setPitch(pitches[sample.id]);
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sample]);

  const toggleMute = useCallback(
    (slot: number) => {
      setMutes((prevMutes) => {
        const newMutes = [...prevMutes];
        newMutes[slot] = !newMutes[slot];
        if (newMutes[slot]) {
          sample.sampler.triggerRelease("C2", Tone.now());
        }
        return newMutes;
      });
    },
    [setMutes, sample]
  );

  const toggleSolo = useCallback(
    (slot: number) => {
      setSolos((prevSolos) => {
        const newSolos = [...prevSolos];
        newSolos[slot] = !newSolos[slot];
        return newSolos;
      });
    },
    [setSolos]
  );

  useEffect(() => {
    const muteOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "m" && !isModal && slotIndex == sample.id) {
        toggleMute(sample.id);
      }
    };

    window.addEventListener("keydown", muteOnKeyInput);

    return () => {
      window.removeEventListener("keydown", muteOnKeyInput);
    };
  }, [slotIndex, isModal, sample.id, toggleMute]);

  useEffect(() => {
    const soloOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "s" && !isModal && slotIndex == sample.id) {
        toggleSolo(sample.id);
      }
    };

    window.addEventListener("keydown", soloOnKeyInput);

    return () => {
      window.removeEventListener("keydown", soloOnKeyInput);
    };
  }, [slotIndex, isModal, sample.id, toggleSolo]);

  const playSample = () => {
    const time = Tone.now();
    sample.sampler.triggerRelease("C2", time);
    sample.envelope.triggerAttack(time);
    sample.envelope.triggerRelease(
      time + transformKnobValue(release, [0, sampleDuration])
    );
    const _pitch = transformKnobValue(pitch, [15.4064, 115.4064]);
    sample.sampler.triggerAttack(_pitch, time);
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
          <Text pr={2} color={color} fontSize="12pt" fontWeight={900}>
            {sample.id + 1}
          </Text>
          <Text fontWeight={600} fontSize="12pt" color="brown">
            {sample.name}
          </Text>
        </Flex>
        <Box px={4} pt={5}>
          <Button
            ref={waveButtonRef}
            w="100%"
            h="60px"
            onMouseDown={() => playSample()}
            bg="transparent"
            opacity={0.8}
            className="wavebutton"
            borderRadius="20px"
            overflow="hidden"
          >
            <Waveform audioFile={sample.url} width={170} />
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
              defaultValue={0}
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-filter`}
              size={50}
              knobValue={filter}
              setKnobValue={setFilter}
              knobTitle="TONE"
              filter={true}
              exponential={true}
              defaultValue={50}
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${sample.id}-release`}
              size={50}
              knobValue={release}
              setKnobValue={setRelease}
              knobTitle="RELEASE"
              defaultValue={100}
            />
          </GridItem>

          <GridItem>
            <Knob
              key={`knob-${sample.id}-pitch`}
              size={50}
              knobValue={pitch}
              setKnobValue={setPitch}
              knobTitle="PITCH"
              knobTransformRange={[43, 88]}
              defaultValue={50}
            />
          </GridItem>
          <GridItem w="100%" h="100%">
            <Box position="absolute" bottom={14}>
              <CustomSlider
                size={85}
                sliderValue={pan}
                setSliderValue={setPan}
                defaultValue={50}
                leftLabel="L"
                centerLabel="|"
                rightLabel="R"
                transformRange={[-100, 100]}
              />
            </Box>
            <Center h="100%" w="100%">
              <Box>
                <Flex
                  boxShadow="0 2px 4px rgba(176, 147, 116, 0.6)"
                  borderRadius="8px"
                  position="absolute"
                  left="10px"
                  bottom={6}
                >
                  <Tooltip label="Mute [M]" color="darkorange" openDelay={500}>
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
                  </Tooltip>
                  <Tooltip label="Solo [S]" color="darkorange" openDelay={500}>
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
                        color={solos[sample.id] ? "darkorange" : "#B09374"}
                      />
                    </Button>
                  </Tooltip>
                </Flex>
              </Box>
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
              defaultValue={92}
            />
          </GridItem>
        </Grid>
      </Box>
    </>
  );
};
