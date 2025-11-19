"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Link,
  Text,
  useToast,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IoPauseSharp, IoPlaySharp } from "react-icons/io5";
import type * as Tone from "tone/build/esm/index";

import { useMasterChain } from "@/hooks/useMasterChain";
import {
  createDrumSequence,
  createInstrumentRuntimes,
  disposeDrumSequence,
  disposeInstrumentRuntimes,
  INIT_INSTRUMENT_RUNTIMES,
  waitForBuffersToLoad,
} from "@/lib/audio/engine";
import { init } from "@/lib/preset";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { useModalStore } from "@/stores/useModalStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";
import { MasterControl } from "./controls/MasterControl";
import { PresetControl } from "./controls/PresetControl";
import { SequencerControl } from "./controls/SequencerControl";
import { TransportControl } from "./controls/TransportControl";
import FrequencyAnalyzer from "./FrequencyAnalyzer";
import { DrumhausLogo } from "./icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "./icon/DrumhausTypographyLogo";
import { FungPeaceLogo } from "./icon/FungPeaceLogo";
import { InstrumentGrid } from "./instrument/InstrumentGrid";
import { MobileModal } from "./modal/MobileModal";
import { Sequencer } from "./Sequencer";

const FADE_IN_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const Drumhaus = () => {
  // Transport
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);
  const setBpm = useTransportStore((state) => state.setBpm);
  const setSwing = useTransportStore((state) => state.setSwing);

  const instrumentSamplePaths = useInstrumentsStore((state) =>
    state.instruments.map((inst) => inst.sample.path).join(","),
  );
  const setAllInstruments = useInstrumentsStore(
    (state) => state.setAllInstruments,
  );

  // Sequencer
  const variationCycle = usePatternStore((state) => state.variationCycle);
  const setPattern = usePatternStore((state) => state.setPattern);
  const setVariation = usePatternStore((state) => state.setVariation);
  const setVariationCycle = usePatternStore((state) => state.setVariationCycle);
  const setVoiceIndex = usePatternStore((state) => state.setVoiceIndex);

  // Master Chain
  const setAllMasterChain = useMasterChainStore(
    (state) => state.setAllMasterChain,
  );

  // Modal store
  const isAnyModalOpen = useModalStore((state) => state.isAnyModalOpen);

  // Preset/Kit metadata store
  const loadPresetMeta = usePresetMetaStore((state) => state.loadPreset);

  // Local
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileWarning, setIsMobileWarning] = useState(false);

  // State architecture for instruments:
  // - Local ref (instrumentRuntimes): ONLY holds Tone.js runtime nodes (samplerNode, envelopeNode, etc.)
  //   Created fresh when kit changes, disposed on cleanup. No data duplication!
  //   Using ref to avoid unnecessary re-renders - components read data from store, not runtime objects
  // - Store (useInstrumentsStore): Single source of truth for serializable InstrumentData
  //   Contains all parameters (attack, release, volume, etc.), persisted to localStorage
  const instrumentRuntimes = useRef<InstrumentRuntime[]>(
    INIT_INSTRUMENT_RUNTIMES,
  );
  const [instrumentRuntimesVersion, setInstrumentRuntimesVersion] = useState(0);

  // Refs
  const toneSequence = useRef<Tone.Sequence | null>(null);
  const bar = useRef<number>(0);
  const chainVariation = useRef<number>(0);

  // Load preset into all stores (single source of truth)
  const loadPreset = useCallback(
    (preset: PresetFileV1) => {
      // Update preset/kit metadata store
      loadPresetMeta(preset);

      // Distribute preset data to respective stores
      setVoiceIndex(0);
      setVariation(0);
      setPattern(preset.sequencer.pattern);
      setVariationCycle(preset.sequencer.variationCycle);
      setBpm(preset.transport.bpm);
      setSwing(preset.transport.swing);
      setAllMasterChain(
        preset.masterChain.lowPass,
        preset.masterChain.hiPass,
        preset.masterChain.phaser,
        preset.masterChain.reverb,
        preset.masterChain.compThreshold,
        preset.masterChain.compRatio,
        preset.masterChain.masterVolume,
      );
      setAllInstruments(preset.kit.instruments);
    },
    [
      loadPresetMeta,
      setVoiceIndex,
      setVariation,
      setPattern,
      setVariationCycle,
      setBpm,
      setSwing,
      setAllMasterChain,
      setAllInstruments,
    ],
  );

  // Toast for warnings
  const toast = useToast({
    position: "top",
  });

  useMasterChain({
    instrumentRuntimes: instrumentRuntimes.current,
    setIsLoading,
  });

  // l o a d   f r o m   q u e r y   p a r a m
  const hasLoadedFromUrl = useRef(false);

  useEffect(() => {
    // Prevent multiple loads in React Strict Mode
    if (hasLoadedFromUrl.current) return;

    const loadPresetData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const presetParam = urlParams.get("p");

      if (presetParam) {
        hasLoadedFromUrl.current = true;

        try {
          const { urlToPreset, UnknownKitError, InvalidPresetError } =
            await import("@/lib/serialization");
          const newPreset = urlToPreset(presetParam);

          loadPreset(newPreset);

          toast({
            render: () => (
              <Box
                bg="silver"
                color="gray"
                p={3}
                borderRadius="8px"
                className="neumorphic"
              >
                <Text>
                  {`You received a custom preset called "${newPreset.meta.name}"!`}
                </Text>
              </Box>
            ),
          });
        } catch (error) {
          console.error(`Error loading shared preset:`, error);

          // Show user-friendly error message
          const { UnknownKitError, InvalidPresetError } = await import(
            "@/lib/serialization"
          );
          let errorMessage = "The shared preset link is invalid or corrupted.";
          if (error instanceof UnknownKitError) {
            errorMessage =
              "This preset uses a kit that is not available in your version.";
          } else if (error instanceof InvalidPresetError) {
            errorMessage = "The shared preset data is corrupted or invalid.";
          }

          toast({
            render: () => (
              <Box
                bg="silver"
                color="gray"
                p={3}
                borderRadius="8px"
                className="neumorphic"
              >
                <Text>{errorMessage}</Text>
              </Box>
            ),
          });

          // Still load default preset on error
          loadPreset(init());
        }
      } else if (!hasLoadedFromUrl.current) {
        // Load default preset on initial mount
        hasLoadedFromUrl.current = true;
        loadPreset(init());
      }
    };

    loadPresetData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // m a k e   g o o d   m u s i c
  useEffect(() => {
    if (isPlaying) {
      createDrumSequence(
        toneSequence,
        instrumentRuntimes,
        variationCycle,
        bar,
        chainVariation,
      );
    }

    return () => {
      disposeDrumSequence(toneSequence);
    };
  }, [isPlaying, instrumentRuntimesVersion, variationCycle]);

  // Create new instrument runtimes only when sample URLs change
  // Parameter changes (attack, release, filter, etc.) should NOT trigger recreation
  // They are applied to existing runtime nodes in InstrumentControls.tsx
  useEffect(() => {
    if (!isLoading) setIsLoading(true);

    // Create runtime nodes from store data
    // Use getState() to avoid subscribing to param changes
    const instruments = useInstrumentsStore.getState().instruments;
    createInstrumentRuntimes(instrumentRuntimes, instruments);

    // Capture the newly created runtimes for cleanup
    const currentRuntimes = instrumentRuntimes.current;

    // Wait for all sampler buffers to load before updating state
    const loadBuffers = async () => {
      try {
        // Wait for all Tone.js audio files to load
        await waitForBuffersToLoad();
        // Trigger re-render for components that need new runtime objects
        setInstrumentRuntimesVersion((v) => v + 1);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading sampler buffers:", error);
        // Still trigger re-render even if loading fails (graceful degradation)
        setInstrumentRuntimesVersion((v) => v + 1);
        setIsLoading(false);
      }
    };

    loadBuffers();

    return () => {
      // Dispose runtimes on cleanup (e.g., on unmount or dependency change)
      // Note: createInstrumentRuntimes already disposes previous runtimes when creating new ones
      disposeInstrumentRuntimes(instrumentRuntimes);
    };
    // Only recreate runtimes when sample paths change, not when other params change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrumentSamplePaths]);

  // p l a y   f r o m   s p a c e b a r
  useEffect(() => {
    const playViaSpacebar = (event: KeyboardEvent) => {
      // Block spacebar when any modal is open or when loading
      if (event.key === " " && !isAnyModalOpen() && !isLoading) {
        togglePlay(instrumentRuntimes.current);
      }
    };

    document.addEventListener("keydown", playViaSpacebar);

    return () => {
      document.removeEventListener("keydown", playViaSpacebar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, instrumentRuntimesVersion]);

  // m o b i l e   d e v i c e   w a r n i n g
  useEffect(() => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (isMobile) {
      setIsMobileWarning(true);
    }
  }, []);

  const closeMobileWarning = () => {
    setIsMobileWarning(false);
  };

  return (
    <>
      <Box
        w={1538}
        h={1030}
        m="auto"
        position="absolute"
        inset={0}
        userSelect="none"
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={FADE_IN_VARIANTS}
          transition={{ duration: 0.5 }} // Adjust the duration as needed
        >
          <Box
            bg="silver"
            w={1538}
            h={1000}
            borderRadius="12px"
            className="neumorphicExtraTall"
            overflow="clip"
          >
            <Box
              h="120px"
              boxShadow="0 4px 8px rgba(176, 147, 116, 0.6)"
              position="relative"
            >
              <Flex
                position="relative"
                h="120px"
                w="750px"
                flexDir="row"
                alignItems="flex-end"
                pl="26px"
                pb="20px"
              >
                <Box display="flex" alignItems="flex-end">
                  <DrumhausLogo size={46} color="#ff7b00" />
                </Box>
                <Box ml={2} display="flex" alignItems="flex-end">
                  <DrumhausTypographyLogo color="#ff7b00" size={420} />
                </Box>
                <Box mb={-1} ml={4}>
                  <Text color="gray" opacity={0.7}>
                    Browser Controlled
                  </Text>
                  <Text color="gray" opacity={0.7}>
                    Rhythmic Groove Machine
                  </Text>
                </Box>
              </Flex>

              <Box
                position="absolute"
                right="26px"
                bottom="18px"
                borderRadius="16px"
                overflow="hidden"
                opacity={0.6}
                boxShadow="0 2px 8px rgba(176, 147, 116, 0.1) inset"
              >
                <FrequencyAnalyzer />
              </Box>
            </Box>

            <Box boxShadow="0 4px 8px rgba(176, 147, 116, 0.6)">
              <InstrumentGrid
                key={instrumentRuntimesVersion}
                instrumentRuntimes={instrumentRuntimes.current}
              />
            </Box>

            <Grid templateColumns="repeat(7, 1fr)" pl={4} py={4} w="100%">
              <GridItem colSpan={1} w="160px" mr={6}>
                <Center w="100%" h="100%">
                  <Button
                    h="140px"
                    w="140px"
                    onClick={() => togglePlay(instrumentRuntimes.current)}
                    className="neumorphicTallRaised"
                    outline="none"
                    onKeyDown={(ev) => ev.preventDefault()}
                  >
                    {isPlaying ? (
                      <IoPauseSharp size={50} color="#ff7b00" />
                    ) : (
                      <IoPlaySharp size={50} color="#B09374" />
                    )}
                  </Button>
                </Center>
              </GridItem>

              <GridItem colSpan={1} mx={0} ml={-3}>
                <SequencerControl />
              </GridItem>

              <GridItem colSpan={1} px={2}>
                <TransportControl />
              </GridItem>

              <GridItem w="380px" px={2}>
                <PresetControl
                  createPresetFn={loadPreset}
                  togglePlay={() => togglePlay(instrumentRuntimes.current)}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                />
              </GridItem>

              <MasterControl />
            </Grid>

            <Box p={8} boxShadow="0 4px 8px rgba(176, 147, 116, 0.6)">
              <Sequencer />
            </Box>

            <Box
              position="absolute"
              right="26px"
              bottom={10}
              opacity={0.2}
              as="a"
              href="https://fung.studio/"
              target="_blank"
            >
              <FungPeaceLogo color="#B09374" size={80} />
            </Box>
          </Box>
          <Box h="20px" w="100%" position="relative">
            <Center w="100%" h="100%">
              <Flex mt={8}>
                <Text color="gray" fontSize={14}>
                  Designed with love by
                </Text>
                <Link
                  href="https://fung.studio/"
                  target="_blank"
                  color="gray"
                  ml={1}
                  fontSize={14}
                >
                  Max Fung.
                </Link>
                <Link
                  href="https://ko-fi.com/maxfung"
                  target="_blank"
                  color="gray"
                  ml={1}
                  fontSize={14}
                >
                  Support on ko-fi.
                </Link>
              </Flex>
            </Center>
          </Box>
        </motion.div>
      </Box>
      <MobileModal isOpen={isMobileWarning} onClose={closeMobileWarning} />
    </>
  );
};

export default Drumhaus;
