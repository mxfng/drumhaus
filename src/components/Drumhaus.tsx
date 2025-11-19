"use client";

import { useEffect, useRef, useState } from "react";
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
  // ============================================================================
  // STORE STATE
  // ============================================================================

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

  const variationCycle = usePatternStore((state) => state.variationCycle);
  const setPattern = usePatternStore((state) => state.setPattern);
  const setVariation = usePatternStore((state) => state.setVariation);
  const setVariationCycle = usePatternStore((state) => state.setVariationCycle);
  const setVoiceIndex = usePatternStore((state) => state.setVoiceIndex);

  const setAllMasterChain = useMasterChainStore(
    (state) => state.setAllMasterChain,
  );

  const isAnyModalOpen = useModalStore((state) => state.isAnyModalOpen);
  const loadPresetMeta = usePresetMetaStore((state) => state.loadPreset);

  // ============================================================================
  // LOCAL STATE
  // ============================================================================

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileWarning, setIsMobileWarning] = useState(false);

  // Audio engine refs (Tone.js runtime nodes)
  const instrumentRuntimes = useRef<InstrumentRuntime[]>([]);
  const [instrumentRuntimesVersion, setInstrumentRuntimesVersion] = useState(0);
  const toneSequence = useRef<Tone.Sequence | null>(null);
  const bar = useRef<number>(0);
  const chainVariation = useRef<number>(0);

  const toast = useToast({ position: "top" });

  useMasterChain({
    instrumentRuntimes: instrumentRuntimes.current,
    setIsLoading,
  });

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  /**
   * Load a preset into all stores.
   * This is the single function that updates the entire app state.
   */
  const loadPreset = (preset: PresetFileV1) => {
    // Stop playback if currently playing (samples will reload)
    if (isPlaying) {
      togglePlay(instrumentRuntimes.current);
    }

    // Update metadata
    loadPresetMeta(preset);

    // Update sequencer
    setVoiceIndex(0);
    setVariation(0);
    setPattern(preset.sequencer.pattern);
    setVariationCycle(preset.sequencer.variationCycle);

    // Update transport
    setBpm(preset.transport.bpm);
    setSwing(preset.transport.swing);

    // Update master chain
    setAllMasterChain(
      preset.masterChain.lowPass,
      preset.masterChain.hiPass,
      preset.masterChain.phaser,
      preset.masterChain.reverb,
      preset.masterChain.compThreshold,
      preset.masterChain.compRatio,
      preset.masterChain.masterVolume,
    );

    // Update instruments (triggers audio engine reload)
    setAllInstruments(preset.kit.instruments);
  };

  /**
   * Load preset from URL parameter or fallback to persisted/default
   */
  const loadFromUrlOrDefault = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get("p");

    if (!presetParam) {
      // Check if we have persisted store values in localStorage
      const hasPersistedData =
        typeof window !== "undefined" &&
        localStorage.getItem("drumhaus-preset-meta-storage") !== null;

      // TODO: Add validation to check if the persisted data is valid
      // This could potentially lead to corrupted projects if any states
      // are malformed.

      if (!hasPersistedData) {
        // No persisted data, load default init preset
        loadPreset(init());
      }
      return;
    }

    try {
      const { urlToPreset } = await import("@/lib/serialization");
      const preset = urlToPreset(presetParam);
      loadPreset(preset);

      toast({
        render: () => (
          <Box
            bg="silver"
            color="gray"
            p={3}
            borderRadius="8px"
            className="neumorphic"
          >
            <Text>{`You received a custom preset called "${preset.meta.name}"!`}</Text>
          </Box>
        ),
      });
    } catch (error) {
      console.error("Failed to load shared preset:", error);

      toast({
        render: () => (
          <Box
            bg="silver"
            color="gray"
            p={3}
            borderRadius="8px"
            className="neumorphic"
          >
            <Text>Failed to load shared preset. Loading default.</Text>
          </Box>
        ),
      });

      loadPreset(init());
    } finally {
      // Remove URL parameter after loading preset
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      window.history.replaceState({}, "", url.toString());
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load initial preset on mount
  useEffect(() => {
    loadFromUrlOrDefault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create/update audio sequencer when playing or instruments change
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

  // Rebuild audio engine when samples change
  useEffect(() => {
    if (instrumentSamplePaths.length === 0) {
      return;
    }

    setIsLoading(true);

    const instruments = useInstrumentsStore.getState().instruments;
    const samplePaths = instruments.map((inst) => inst.sample.path);

    const loadBuffers = async () => {
      try {
        await createInstrumentRuntimes(instrumentRuntimes, instruments);
        await waitForBuffersToLoad();
        setInstrumentRuntimesVersion((v) => v + 1);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading audio buffers:", error);
        setInstrumentRuntimesVersion((v) => v + 1);
        setIsLoading(false);
      }
    };

    loadBuffers();

    return () => {
      disposeInstrumentRuntimes(instrumentRuntimes);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrumentSamplePaths]);

  // Spacebar to play/pause
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === " " && !isAnyModalOpen() && !isLoading) {
        togglePlay(instrumentRuntimes.current);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, instrumentRuntimesVersion]);

  // Mobile device warning
  useEffect(() => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    if (isMobile) setIsMobileWarning(true);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (instrumentRuntimes.current.length === 0) {
    // TODO: Add a fallback UI here or cover all of this with a loading screen until fade in
    return <div></div>;
  }

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
          transition={{ duration: 0.5 }}
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
                <PresetControl loadPreset={loadPreset} />
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
      <MobileModal
        isOpen={isMobileWarning}
        onClose={() => setIsMobileWarning(false)}
      />
    </>
  );
};

export default Drumhaus;
