"use client";

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

import { Sample } from "@/types/types";

import "@fontsource-variable/pixelify-sans";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImVolumeMute, ImVolumeMute2 } from "react-icons/im";
import { MdHeadphones } from "react-icons/md";
import * as Tone from "tone/build/esm/index";

import { useSampleDuration } from "@/hooks/useSampleDuration";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { CustomSlider } from "../common/CustomSlider";
import {
  Knob,
  transformKnobFilterValue,
  transformKnobValue,
} from "../common/Knob";
import Waveform from "./Waveform";

type InstrumentParams = {
  color?: string;
  sample: Sample;
  bg?: string;
  isModal: boolean;
  instrumentIndex: number;
};

export const Instrument: React.FC<InstrumentParams> = ({
  color = "#ff7b00",
  sample,
  isModal,
  instrumentIndex,
  ...props
}) => {
  // Subscribe only to THIS instrument's data (prevents cross-instrument re-renders!)
  const attack = useInstrumentsStore((state) => state.attacks[sample.id]);
  const release = useInstrumentsStore((state) => state.releases[sample.id]);
  const filter = useInstrumentsStore((state) => state.filters[sample.id]);
  const pan = useInstrumentsStore((state) => state.pans[sample.id]);
  const volume = useInstrumentsStore((state) => state.volumes[sample.id]);
  const pitch = useInstrumentsStore((state) => state.pitches[sample.id]);
  const mute = useInstrumentsStore((state) => state.mutes[sample.id]);
  const solo = useInstrumentsStore((state) => state.solos[sample.id]);

  // Get store actions
  const setAttackStore = useInstrumentsStore((state) => state.setAttack);
  const setReleaseStore = useInstrumentsStore((state) => state.setRelease);
  const setFilterStore = useInstrumentsStore((state) => state.setFilter);
  const setPanStore = useInstrumentsStore((state) => state.setPan);
  const setVolumeStore = useInstrumentsStore((state) => state.setVolume);
  const setPitchStore = useInstrumentsStore((state) => state.setPitch);
  const setDurationStore = useInstrumentsStore((state) => state.setDuration);
  const toggleMuteStore = useInstrumentsStore((state) => state.toggleMute);
  const toggleSoloStore = useInstrumentsStore((state) => state.toggleSolo);

  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const sampleDuration = useSampleDuration(sample.sampler, sample.url);

  // Wrap store setters with instrument ID
  const setAttack = useCallback(
    (value: number) => setAttackStore(sample.id, value),
    [sample.id, setAttackStore],
  );
  const setRelease = useCallback(
    (value: number) => setReleaseStore(sample.id, value),
    [sample.id, setReleaseStore],
  );
  const setFilter = useCallback(
    (value: number) => setFilterStore(sample.id, value),
    [sample.id, setFilterStore],
  );
  const setPan = useCallback(
    (value: number) => setPanStore(sample.id, value),
    [sample.id, setPanStore],
  );
  const setVolume = useCallback(
    (value: number) => setVolumeStore(sample.id, value),
    [sample.id, setVolumeStore],
  );
  const setPitch = useCallback(
    (value: number) => setPitchStore(sample.id, value),
    [sample.id, setPitchStore],
  );
  const toggleMute = useCallback(
    () => toggleMuteStore(sample.id),
    [sample.id, toggleMuteStore],
  );
  const toggleSolo = useCallback(
    () => toggleSoloStore(sample.id),
    [sample.id, toggleSoloStore],
  );

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

  // Update duration in store when sample duration changes
  useEffect(() => {
    setDurationStore(sample.id, sampleDuration);
  }, [sampleDuration, sample.id, setDurationStore]);

  const handleToggleMute = useCallback(() => {
    // Release the sample when muting (before toggling state)
    if (!mute) {
      sample.sampler.triggerRelease("C2", Tone.now());
    }
    toggleMute();
  }, [toggleMute, mute, sample]);

  useEffect(() => {
    const muteOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "m" && !isModal && instrumentIndex == sample.id) {
        handleToggleMute();
      }
    };

    window.addEventListener("keydown", muteOnKeyInput);

    return () => {
      window.removeEventListener("keydown", muteOnKeyInput);
    };
  }, [instrumentIndex, isModal, sample.id, handleToggleMute]);

  useEffect(() => {
    const soloOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "s" && !isModal && instrumentIndex == sample.id) {
        toggleSolo();
      }
    };

    window.addEventListener("keydown", soloOnKeyInput);

    return () => {
      window.removeEventListener("keydown", soloOnKeyInput);
    };
  }, [instrumentIndex, isModal, sample.id, toggleSolo]);

  const playSample = () => {
    const time = Tone.now();
    sample.sampler.triggerRelease("C2", time);
    sample.envelope.triggerAttack(time);
    sample.envelope.triggerRelease(
      time + transformKnobValue(release, [0, sampleDuration]),
    );
    const _pitch = transformKnobValue(pitch, [15.4064, 115.4064]);
    sample.sampler.triggerAttack(_pitch, time);
  };

  return (
    <>
      <Box
        w="100%"
        key={`Instrument-${sample.name}`}
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
                      onClick={() => handleToggleMute()}
                      className="raised"
                    >
                      {mute ? (
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
                      onClick={() => toggleSolo()}
                      className="raised"
                    >
                      <MdHeadphones color={solo ? "darkorange" : "#B09374"} />
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
