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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImVolumeMute, ImVolumeMute2 } from "react-icons/im";
import { MdHeadphones } from "react-icons/md";
import * as Tone from "tone/build/esm/index";

import { useSampleDuration } from "@/hooks/useSampleDuration";
import { playInstrumentSample } from "@/lib/audio/engine";
import {
  INSTRUMENT_ATTACK_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_PITCH_SEMITONE_RANGE,
  INSTRUMENT_RELEASE_RANGE,
  INSTRUMENT_VOLUME_RANGE,
  SAMPLER_ROOT_NOTE,
} from "@/lib/audio/engine/constants";
import { subscribeRuntimeToInstrumentParams } from "@/lib/audio/engine/instrumentParams";
import { PITCH_KNOB_STEP } from "@/lib/audio/engine/pitch";
import { stopRuntimeAtTime } from "@/lib/audio/engine/runtimeStops";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useModalStore } from "@/stores/useModalStore";
import { CustomSlider } from "../common/CustomSlider";
import {
  Knob,
  transformKnobValue,
  transformKnobValueExponential,
} from "../common/Knob";
import { PixelatedFrowny } from "../common/PixelatedFrowny";
import { PixelatedSpinner } from "../common/PixelatedSpinner";
import Waveform from "./Waveform";

type InstrumentControlParams = {
  runtime?: InstrumentRuntime; // Tone.js audio nodes only
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

  // Use granular selectors - only re-render when specific params change
  // This prevents unnecessary re-renders when other instrument params change
  const attack = useInstrumentsStore(
    (state) => state.instruments[index].params.attack,
  );
  const release = useInstrumentsStore(
    (state) => state.instruments[index].params.release,
  );
  const filter = useInstrumentsStore(
    (state) => state.instruments[index].params.filter,
  );
  const pan = useInstrumentsStore(
    (state) => state.instruments[index].params.pan,
  );
  const volume = useInstrumentsStore(
    (state) => state.instruments[index].params.volume,
  );
  const pitch = useInstrumentsStore(
    (state) => state.instruments[index].params.pitch,
  );
  const mute = useInstrumentsStore(
    (state) => state.instruments[index].params.mute,
  );
  const solo = useInstrumentsStore(
    (state) => state.instruments[index].params.solo,
  );

  // Get sample path and meta separately (these change less frequently)
  const samplePath = useInstrumentsStore(
    (state) => state.instruments[index].sample.path,
  );
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );

  // Get store actions
  const setInstrumentProperty = useInstrumentsStore(
    (state) => state.setInstrumentProperty,
  );
  const setDurationStore = useInstrumentsStore((state) => state.setDuration);
  const toggleMuteStore = useInstrumentsStore((state) => state.toggleMute);
  const toggleSoloStore = useInstrumentsStore((state) => state.toggleSolo);

  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const sampleDuration = useSampleDuration(samplePath);
  const [waveformError, setWaveformError] = useState<Error | null>(null);

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
  const formatPitchLabel = useCallback((value: number) => {
    const semitoneOffset =
      ((value - 50) / 50) * INSTRUMENT_PITCH_SEMITONE_RANGE;
    const signedOffset =
      semitoneOffset > 0
        ? `+${semitoneOffset.toFixed(0)}`
        : semitoneOffset.toFixed(0);
    return `${signedOffset} st`;
  }, []);
  const formatDurationLabel = useCallback((seconds: number) => {
    if (!seconds || !Number.isFinite(seconds)) return "0 ms";
    if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
    if (seconds < 10) return `${seconds.toFixed(2)} s`;
    return `${seconds.toFixed(1)} s`;
  }, []);
  const formatAttackLabel = useCallback(
    (value: number) => {
      const attackSeconds = transformKnobValue(value, INSTRUMENT_ATTACK_RANGE);
      return formatDurationLabel(attackSeconds);
    },
    [formatDurationLabel],
  );
  const formatReleaseLabel = useCallback(
    (value: number) => {
      const releaseSeconds = transformKnobValueExponential(
        value,
        INSTRUMENT_RELEASE_RANGE,
      );
      return formatDurationLabel(releaseSeconds);
    },
    [formatDurationLabel],
  );

  // Subscribe to instrument parameter changes and update audio nodes directly
  // This avoids multiple useEffects and updates audio without causing re-renders
  useEffect(() => {
    if (!runtime) return;
    return subscribeRuntimeToInstrumentParams(index, runtime);
  }, [index, runtime]);

  const isRuntimeLoaded = useMemo(() => !!runtime, [runtime]);

  // Reset waveform error when sample path changes (retry on new sample)
  useEffect(() => {
    setWaveformError(null);
  }, [samplePath]);

  const handleWaveformError = useCallback((error: Error) => {
    setWaveformError(error);
  }, []);

  // Update duration in store when sample duration changes
  useEffect(() => {
    setDurationStore(index, sampleDuration);
  }, [sampleDuration, index, setDurationStore]);

  const handleToggleMute = useCallback(() => {
    // Release the sample when muting (before toggling state)
    if (!mute && runtime?.samplerNode) {
      stopRuntimeAtTime(runtime, Tone.now());
    }
    toggleMute();
  }, [toggleMute, mute, runtime]);

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
    if (!runtime) return;

    playInstrumentSample(runtime, pitch, release);
  };

  return (
    <>
      <Box
        w="100%"
        key={`Instrument-${instrumentMeta.id}-${index}`}
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
            {instrumentMeta.name}
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
            isDisabled={!isRuntimeLoaded}
            position="relative"
          >
            {isRuntimeLoaded && !waveformError ? (
              <Waveform
                audioFile={samplePath}
                width={170}
                onError={handleWaveformError}
              />
            ) : waveformError ? (
              <Center w="100%" h="100%">
                <PixelatedFrowny color={color} />
              </Center>
            ) : (
              <Center w="100%" h="100%">
                <PixelatedSpinner color={color} />
              </Center>
            )}
          </Button>
        </Box>

        <Grid
          templateColumns="repeat(2, 1fr)"
          p={1}
          opacity={isRuntimeLoaded ? 1 : 0.5}
        >
          <GridItem>
            <Knob
              key={`knob-${instrumentMeta.id}-${index}-attack`}
              value={attack}
              onChange={setAttack}
              label="ATTACK"
              defaultValue={0}
              disabled={!isRuntimeLoaded}
              size="sm"
              formatValue={formatAttackLabel}
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${index}-filter`}
              value={filter}
              onChange={setFilter}
              label="TONE"
              scale="split-filter"
              defaultValue={50}
              disabled={!isRuntimeLoaded}
              size="sm"
            />
          </GridItem>
          <GridItem>
            <Knob
              key={`knob-${instrumentMeta.id}-${index}-release`}
              value={release}
              onChange={setRelease}
              label="RELEASE"
              defaultValue={100}
              disabled={!isRuntimeLoaded}
              size="sm"
              formatValue={formatReleaseLabel}
            />
          </GridItem>

          <GridItem>
            <Knob
              key={`knob-${instrumentMeta.id}-${index}-pitch`}
              value={pitch}
              onChange={setPitch}
              label="PITCH"
              step={PITCH_KNOB_STEP}
              defaultValue={50}
              disabled={!isRuntimeLoaded}
              formatValue={formatPitchLabel}
              size="sm"
            />
          </GridItem>
          <GridItem w="100%" h="100%">
            <Box
              position="absolute"
              bottom={14}
              opacity={isRuntimeLoaded ? 1 : 0.5}
            >
              <CustomSlider
                size={85}
                sliderValue={pan}
                setSliderValue={setPan}
                defaultValue={50}
                leftLabel="L"
                centerLabel="|"
                rightLabel="R"
                transformRange={INSTRUMENT_PAN_RANGE}
                displayRange={[-100, 100]}
                isDisabled={!isRuntimeLoaded}
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
                  opacity={isRuntimeLoaded ? 1 : 0.5}
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
                      isDisabled={!isRuntimeLoaded}
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
                      isDisabled={!isRuntimeLoaded}
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
              key={`knob-${instrumentMeta.id}-${index}-volume`}
              value={volume}
              onChange={setVolume}
              label="VOLUME"
              units="dB"
              range={INSTRUMENT_VOLUME_RANGE}
              defaultValue={92}
              disabled={!isRuntimeLoaded}
              formatValue={(knobValue) =>
                knobValue <= 0
                  ? "-∞ dB"
                  : `${transformKnobValue(
                      knobValue,
                      INSTRUMENT_VOLUME_RANGE,
                    ).toFixed(1)} dB`
              }
            />
          </GridItem>
        </Grid>
      </Box>
    </>
  );
};
