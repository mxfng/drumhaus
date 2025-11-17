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
import * as Tone from "tone/build/esm/index";

import { _samples, createSamples } from "@/lib/createSamples";
import makeGoodMusic from "@/lib/makeGoodMusic";
import * as init from "@/lib/presets/init";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterFXStore } from "@/stores/useMasterFXStore";
import { useSequencerStore } from "@/stores/useSequencerStore";
import { useTransportStore } from "@/stores/useTransportStore";
import { Kit, Preset, Sample } from "@/types/types";
import {
  Knob,
  transformKnobValue,
  transformKnobValueExponential,
} from "./common/Knob";
import { MasterCompressor } from "./controls/MasterCompressor";
import { MasterFX } from "./controls/MasterFX";
import { MasterVolume } from "./controls/MasterVolume";
import { PresetControl } from "./controls/PresetControl";
import { SequencerControl } from "./controls/SequencerControl";
import { TransportControl } from "./controls/TransportControl";
import FrequencyAnalyzer from "./FrequencyAnalyzer";
import { DrumhausLogo } from "./icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "./icon/DrumhausTypographyLogo";
import { FungPeaceLogo } from "./icon/FungPeaceLogo";
import { MobileModal } from "./modal/MobileModal";
import { Sequencer } from "./Sequencer";
import { InstrumentsGrid } from "./slots/InstrumentsGrid";

const Drumhaus = () => {
  // Transport store - only subscribe to what's used in THIS component
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);
  const setBpm = useTransportStore((state) => state.setBpm);
  const setSwing = useTransportStore((state) => state.setSwing);

  // Instruments store - get batch setters for preset loading
  const setAllAttacks = useInstrumentsStore((state) => state.setAllAttacks);
  const setAllReleases = useInstrumentsStore((state) => state.setAllReleases);
  const setAllFilters = useInstrumentsStore((state) => state.setAllFilters);
  const setAllVolumes = useInstrumentsStore((state) => state.setAllVolumes);
  const setAllPans = useInstrumentsStore((state) => state.setAllPans);
  const setAllMutes = useInstrumentsStore((state) => state.setAllMutes);
  const setAllSolos = useInstrumentsStore((state) => state.setAllSolos);
  const setAllPitches = useInstrumentsStore((state) => state.setAllPitches);

  // Sequencer store - subscribe to chain for live updates during playback
  const chain = useSequencerStore((state) => state.chain);
  const pattern = useSequencerStore((state) => state.pattern);

  // Sequencer store - get setters for preset loading
  const setPattern = useSequencerStore((state) => state.setPattern);
  const setVariation = useSequencerStore((state) => state.setVariation);
  const setChain = useSequencerStore((state) => state.setChain);
  const setVoiceIndex = useSequencerStore((state) => state.setVoiceIndex);

  // Master FX store - subscribe to values for useEffect dependencies
  const lowPass = useMasterFXStore((state) => state.lowPass);
  const hiPass = useMasterFXStore((state) => state.hiPass);
  const phaser = useMasterFXStore((state) => state.phaser);
  const reverb = useMasterFXStore((state) => state.reverb);
  const compThreshold = useMasterFXStore((state) => state.compThreshold);
  const compRatio = useMasterFXStore((state) => state.compRatio);
  const masterVolume = useMasterFXStore((state) => state.masterVolume);

  // Master FX store - get setter for preset loading
  const setAllMasterFX = useMasterFXStore((state) => state.setAllMasterFX);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [preset, setPreset] = useState<Preset>(init.init());
  const [isMobileWarning, setIsMobileWarning] = useState(false);
  const [isModal, setIsModal] = useState(false);

  // g l o b a l
  const [kit, setKit] = useState<Kit>(preset._kit);
  const [samples, setSamples] = useState<Sample[]>(_samples);

  // i n s t r u m e n t s - now managed by Instruments Store

  // r e f s
  const toneSequence = useRef<Tone.Sequence | null>(null); // Will migrate to store in future phases
  const toneLPFilter = useRef<Tone.Filter>();
  const toneHPFilter = useRef<Tone.Filter>();
  const tonePhaser = useRef<Tone.Phaser>();
  const toneReverb = useRef<Tone.Reverb>();
  const toneCompressor = useRef<Tone.Compressor>();
  const bar = useRef<number>(0);
  const chainVariation = useRef<number>(0);

  const customPresetAlert = useToast({
    position: "top",
  });

  // l o a d   f r o m   q u e r y   p a r a m
  useEffect(() => {
    const loadPresetData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const presetKey = urlParams.get("preset");

      if (presetKey) {
        try {
          const response = await fetch(`/api/presets?preset_key=${presetKey}`);

          if (!response.ok) {
            throw new Error("Unable to load preset from key");
          }

          const data = await response.json();

          if (data.presets.rows.length < 1) {
            customPresetAlert({
              render: () => (
                <Box
                  bg="silver"
                  color="gray"
                  p={3}
                  borderRadius="8px"
                  className="neumorphic"
                >
                  <Text>{`The preset in the provided link could not be found.`}</Text>
                </Box>
              ),
            });
          } else {
            const newPreset: Preset = data.presets.rows[0].preset_data;

            setPreset(newPreset);

            customPresetAlert({
              render: () => (
                <Box
                  bg="silver"
                  color="gray"
                  p={3}
                  borderRadius="8px"
                  className="neumorphic"
                >
                  <Text>
                    {`You received a custom preset called "${newPreset.name}"!`}
                  </Text>
                </Box>
              ),
            });
          }
        } catch (error) {
          console.error(
            `Error fetching provided preset key ${presetKey}:`,
            error,
          );
        }
      }
    };

    loadPresetData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // m a k e   g o o d   m u s i c
  useEffect(() => {
    if (isPlaying) {
      makeGoodMusic(toneSequence, samples, chain, bar, chainVariation);
    }

    return () => {
      toneSequence.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, samples, chain, pattern]);

  // p r e s e t   c h a n g e
  useEffect(() => {
    if (!isLoading) setIsLoading(true);

    function setFromPreset(_preset: Preset) {
      // Sequencer state
      setVoiceIndex(0);
      setVariation(0);
      setPattern(_preset._pattern);
      setChain(_preset._chain);

      // Kit
      setKit(_preset._kit);

      // Transport
      setBpm(_preset._bpm); // Updates store + Tone.Transport
      setSwing(_preset._swing); // Updates store + Tone.Transport

      // Master FX
      setAllMasterFX(
        _preset._lowPass,
        _preset._hiPass,
        _preset._phaser,
        _preset._reverb,
        _preset._compThreshold,
        _preset._compRatio,
        _preset._masterVolume,
      );
    }

    setFromPreset({ ...preset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // k i t   c h a n g e
  useEffect(() => {
    if (!isLoading) setIsLoading(true);

    const newSamples = createSamples(kit.samples);

    setSamples(newSamples);
    setAllAttacks(kit._attacks);
    setAllReleases(kit._releases);
    setAllFilters(kit._filters);
    setAllPans(kit._pans);
    setAllVolumes(kit._volumes);
    setAllSolos(kit._solos);
    setAllMutes(kit._mutes);

    // backwards compatibility for pitch params
    if (kit._pitches) {
      setAllPitches(kit._pitches);
    } else {
      // old save files
      setAllPitches([50, 50, 50, 50, 50, 50, 50, 50]);
    }

    return () => {
      samples.forEach((sample) => {
        sample.sampler.dispose();
        sample.envelope.dispose();
        sample.filter.dispose();
        sample.panner.dispose();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit]);

  // s a m p l e s   c h a n g e
  useEffect(() => {
    setMasterChain();
    setIsLoading(false);

    return () => {
      toneLPFilter.current?.dispose();
      toneHPFilter.current?.dispose();
      tonePhaser.current?.dispose();
      toneReverb.current?.dispose();
      toneCompressor.current?.dispose();
    };

    function setMasterChain() {
      toneLPFilter.current = new Tone.Filter(15000, "lowpass");
      toneHPFilter.current = new Tone.Filter(0, "highpass");
      tonePhaser.current = new Tone.Phaser({
        frequency: 1,
        octaves: 3,
        baseFrequency: 1000,
      });
      toneReverb.current = new Tone.Reverb(1);
      toneCompressor.current = new Tone.Compressor({
        threshold: 0,
        ratio: 1,
        attack: 0.5,
        release: 1,
      });

      if (
        toneLPFilter.current &&
        toneHPFilter.current &&
        tonePhaser.current &&
        toneReverb.current &&
        toneCompressor.current
      ) {
        samples.forEach((sample) => {
          sample.sampler.chain(
            sample.envelope,
            sample.filter,
            sample.panner,
            toneLPFilter.current!!,
            toneHPFilter.current!!,
            tonePhaser.current!!,
            toneReverb.current!!,
            toneCompressor.current!!,
            Tone.Destination,
          );
        });
      }
    }
  }, [samples]);

  // t o g g l e   p l a y (now handled by store)
  const handleTogglePlay = async () => {
    await togglePlay(samples);
  };

  // p l a y   f r o m   s p a c e b a r
  useEffect(() => {
    const playViaSpacebar = (event: KeyboardEvent) => {
      if (event.key === " " && !isModal) handleTogglePlay();
    };

    document.addEventListener("keydown", playViaSpacebar);

    return () => {
      document.removeEventListener("keydown", playViaSpacebar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal, samples]);

  // r e g i s t e r   s e r v i c e   w o r k e r
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log(
            "Service Worker registered with scope:",
            registration.scope,
          );
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  // c o n t r o l   p r o p s
  // BPM and swing are now handled by the Transport Store

  useEffect(() => {
    const newLowPass = transformKnobValueExponential(lowPass, [0, 15000]);
    if (toneLPFilter.current) {
      toneLPFilter.current.frequency.value = newLowPass;
    }
  }, [lowPass, samples]);

  useEffect(() => {
    const newHiPass = transformKnobValueExponential(hiPass, [0, 15000]);
    if (toneHPFilter.current) {
      toneHPFilter.current.frequency.value = newHiPass;
    }
  }, [hiPass, samples]);

  useEffect(() => {
    const newPhaserWet = transformKnobValue(phaser, [0, 1]);
    if (tonePhaser.current) {
      tonePhaser.current.wet.value = newPhaserWet;
    }
  }, [phaser, samples]);

  useEffect(() => {
    const newReverbWet = transformKnobValue(reverb, [0, 0.5]);
    const newReverbDecay = transformKnobValue(reverb, [0.1, 3]);
    if (toneReverb.current) {
      toneReverb.current.wet.value = newReverbWet;
      toneReverb.current.decay = newReverbDecay;
    }
  }, [reverb, samples]);

  useEffect(() => {
    const newCompThreshold = transformKnobValue(compThreshold, [-40, 0]);
    if (toneCompressor.current) {
      toneCompressor.current.threshold.value = newCompThreshold;
    }
  }, [compThreshold, samples]);

  useEffect(() => {
    const newCompRatio = Math.floor(transformKnobValue(compRatio, [1, 8]));
    if (toneCompressor.current) {
      toneCompressor.current.ratio.value = newCompRatio;
    }
  }, [compRatio, samples]);

  useEffect(() => {
    const newMasterVolume = transformKnobValue(masterVolume, [-46, 4]);
    Tone.Destination.volume.value = newMasterVolume;
  }, [masterVolume, preset]);

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

  const fadeInVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
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
          variants={fadeInVariants}
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
              <InstrumentsGrid samples={samples} isModal={isModal} />
            </Box>

            <Grid templateColumns="repeat(7, 1fr)" pl={4} py={4} w="100%">
              <GridItem colSpan={1} w="160px" mr={6}>
                <Center w="100%" h="100%">
                  <Button
                    h="140px"
                    w="140px"
                    onClick={handleTogglePlay}
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
                  preset={preset}
                  setPreset={setPreset}
                  kit={kit}
                  setKit={setKit}
                  togglePlay={handleTogglePlay}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  setIsModal={setIsModal}
                />
              </GridItem>

              <GridItem colSpan={1} w={120} pl={8} pr={4}>
                <MasterFX />
              </GridItem>

              <GridItem colSpan={1} px={4}>
                <MasterCompressor />
              </GridItem>

              <GridItem colSpan={1} w={140}>
                <MasterVolume />
              </GridItem>
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
