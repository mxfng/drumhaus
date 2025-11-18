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

import type { InstrumentRuntime } from "@/types/instrument";

import "@fontsource-variable/pixelify-sans";

import { useCallback, useEffect, useRef } from "react";
import { ImVolumeMute, ImVolumeMute2 } from "react-icons/im";
import { MdHeadphones } from "react-icons/md";
import * as Tone from "tone/build/esm/index";

import { useSampleDuration } from "@/hooks/useSampleDuration";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useModalStore } from "@/stores/useModalStore";
import { CustomSlider } from "../common/CustomSlider";
import {
  Knob,
  transformKnobFilterValue,
  transformKnobValue,
} from "../common/Knob";
import Waveform from "./Waveform";

type InstrumentControlParams = {
  runtime: InstrumentRuntime; // Tone.js audio nodes only
  color?: string;
  bg?: string;
  index: number; // Array index of this instrument (0-7)
  instrumentIndex: number; // Currently selected instrument for keyboard shortcuts
};

export const InstrumentControl: React.FC<InstrumentControlParams> = ({
  runtime,
  index,
  instrumentIndex,
  color = "#ff7b00",
  ...props
}) => {
  // Modal store
  const isAnyModalOpen = useModalStore((state) => state.isAnyModalOpen);

  const instrumentData = useInstrumentsStore(
    (state) => state.instruments[index],
  );
  const attack = instrumentData.params.attack;
  const release = instrumentData.params.release;
  const filter = instrumentData.params.filter;
  const pan = instrumentData.params.pan;
  const volume = instrumentData.params.volume;
  const pitch = instrumentData.params.pitch;
  const mute = instrumentData.params.mute;
  const solo = instrumentData.params.solo;

  // Get store actions
  const setInstrumentProperty = useInstrumentsStore(
    (state) => state.setInstrumentProperty,
  );
  const setDurationStore = useInstrumentsStore((state) => state.setDuration);
  const toggleMuteStore = useInstrumentsStore((state) => state.toggleMute);
  const toggleSoloStore = useInstrumentsStore((state) => state.toggleSolo);

  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const currentPitchRef = useRef<number | null>(null);
  const sampleDuration = useSampleDuration(
    runtime.samplerNode,
    instrumentData.sample.path,
  );

  // Wrap store setters with instrument index for convenient prop-based interfaces
  const setAttack = useCallback(
    (value: number) => setInstrumentProperty(index, "attack", value),
    [index, setInstrumentProperty],
  );
  const setRelease = useCallback(
    (value: number) => setInstrumentProperty(index, "release", value),
    [index, setInstrumentProperty],
  );
  const setFilter = useCallback(
    (value: number) => setInstrumentProperty(index, "filter", value),
    [index, setInstrumentProperty],
  );
  const setPan = useCallback(
    (value: number) => setInstrumentProperty(index, "pan", value),
    [index, setInstrumentProperty],
  );
  const setVolume = useCallback(
    (value: number) => setInstrumentProperty(index, "volume", value),
    [index, setInstrumentProperty],
  );
  const setPitch = useCallback(
    (value: number) => setInstrumentProperty(index, "pitch", value),
    [index, setInstrumentProperty],
  );
  const toggleMute = useCallback(
    () => toggleMuteStore(index),
    [index, toggleMuteStore],
  );
  const toggleSolo = useCallback(
    () => toggleSoloStore(index),
    [index, toggleSoloStore],
  );

  // Apply store data to Tone.js runtime nodes when parameters change
  useEffect(() => {
    const newAttackValue = transformKnobValue(attack, [0, 0.1]);
    runtime.envelopeNode.attack = newAttackValue;
  }, [attack, runtime.envelopeNode]);

  useEffect(() => {
    runtime.filterNode.type = filter <= 49 ? "lowpass" : "highpass";
    runtime.filterNode.frequency.value = transformKnobFilterValue(filter);
  }, [filter, runtime.filterNode]);

  useEffect(() => {
    const newPanValue = transformKnobValue(pan, [-1, 1]);
    runtime.pannerNode.pan.value = newPanValue;
  }, [pan, runtime.pannerNode]);

  useEffect(() => {
    const newVolumeValue = transformKnobValue(volume, [-46, 4]);
    runtime.samplerNode.volume.value = newVolumeValue;
  }, [volume, runtime.samplerNode]);

  // Update duration in store when sample duration changes
  useEffect(() => {
    setDurationStore(index, sampleDuration);
  }, [sampleDuration, index, setDurationStore]);

  const handleToggleMute = useCallback(() => {
    // Release the sample when muting (before toggling state)
    if (!mute) {
      runtime.samplerNode.triggerRelease("C2", Tone.now());
    }
    toggleMute();
  }, [toggleMute, mute, runtime.samplerNode]);

  useEffect(() => {
    const muteOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "m" && !isAnyModalOpen() && instrumentIndex == index) {
        handleToggleMute();
      }
    };

    window.addEventListener("keydown", muteOnKeyInput);

    return () => {
      window.removeEventListener("keydown", muteOnKeyInput);
    };
  }, [instrumentIndex, index, handleToggleMute, isAnyModalOpen]);

  useEffect(() => {
    const soloOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "s" && !isAnyModalOpen() && instrumentIndex == index) {
        toggleSolo();
      }
    };

    window.addEventListener("keydown", soloOnKeyInput);

    return () => {
      window.removeEventListener("keydown", soloOnKeyInput);
    };
  }, [instrumentIndex, index, toggleSolo, isAnyModalOpen]);

  const playSample = () => {
    const time = Tone.now();
    // Should be monophonic
    runtime.envelopeNode.triggerRelease(time);
    // Release the specific note if we're tracking it, otherwise release all
    if (currentPitchRef.current !== null) {
      runtime.samplerNode.triggerRelease(currentPitchRef.current, time);
    }
    runtime.samplerNode.triggerRelease(time);
    runtime.envelopeNode.triggerAttack(time);
    runtime.envelopeNode.triggerRelease(
      time + transformKnobValue(release, [0, sampleDuration]),
    );
    const _pitch = transformKnobValue(pitch, [15.4064, 115.4064]);
    currentPitchRef.current = _pitch;
    runtime.samplerNode.triggerAttack(_pitch, time);
  };

  return (
    <>
      <Box
        w="100%"
        key={`Instrument-${instrumentData.meta.id}-${index}`}
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
            {index + 1}
          </Text>
          <Text fontWeight={600} fontSize="12pt" color="brown">
            {instrumentData.meta.name}
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
            <Waveform audioFile={instrumentData.sample.path} width={170} />
          </Button>
        </Box>

        <Grid templateColumns="repeat(2, 1fr)" p={1}>
          <GridItem>
            <Knob
              key={`knob-${instrumentData.meta.id}-${index}-attack`}
              size={50}
              knobValue={attack}
              setKnobValue={setAttack}
              knobTitle="ATTACK"
              defaultValue={0}
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${index}-filter`}
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
              key={`knob-${instrumentData.meta.id}-${index}-release`}
              size={50}
              knobValue={release}
              setKnobValue={setRelease}
              knobTitle="RELEASE"
              defaultValue={100}
            />
          </GridItem>

          <GridItem>
            <Knob
              key={`knob-${instrumentData.meta.id}-${index}-pitch`}
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
              key={`knob-${instrumentData.meta.id}-${index}-volume`}
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
