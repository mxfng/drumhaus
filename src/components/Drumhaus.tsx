"use client";

import * as init from "@/lib/presets/init";
import { Kit, Preset, Sample, Sequences } from "@/types/types";
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
import { useEffect, useMemo, useRef, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Sequencer } from "./Sequencer";
import { SlotsGrid } from "./slots/SlotsGrid";
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import { TransportControl } from "./controls/TransportControl";
import {
  Knob,
  transformKnobValue,
  transformKnobValueExponential,
} from "./common/Knob";
import { SequencerControl } from "./controls/SequencerControl";
import { MasterFX } from "./controls/MasterFX";
import { MasterCompressor } from "./controls/MasterCompressor";
import { PresetControl } from "./controls/PresetControl";
import { DrumhausLogo } from "./svg/DrumhausLogo";
import { SignatureLogo } from "./svg/SignatureLogo";
import makeGoodMusic from "@/lib/makeGoodMusic";
import { _samples, createSamples } from "@/lib/createSamples";
import { MobileModal } from "./modal/MobileModal";
import { motion } from "framer-motion";
import FrequencyAnalyzer from "./FrequencyAnalyzer";

const Drumhaus = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [preset, setPreset] = useState<Preset>(init.init());
  const [isMobileWarning, setIsMobileWarning] = useState(false);
  const [isModal, setIsModal] = useState(false);

  // g l o b a l
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState(0); // 0 - 15
  const [slotIndex, setSlotIndex] = useState<number>(0); // 0-7
  const [kit, setKit] = useState<Kit>(preset._kit);
  const [samples, setSamples] = useState<Sample[]>(_samples);
  const [sequences, setSequences] = useState<Sequences>(preset._sequences);
  const [variation, setVariation] = useState<number>(preset._variation); // A = 0, B = 1
  const [chain, setChain] = useState<number>(preset._chain); // A = 0, B = 1, AB = 2, AAAB = 3
  const [currentSequence, setCurrentSequence] = useState<boolean[]>(
    preset._sequences[slotIndex][variation][0]
  );

  // m a s t e r   c o n t r o l s
  const [bpm, setBpm] = useState(preset._bpm);
  const [swing, setSwing] = useState(preset._swing);
  const [lowPass, setLowPass] = useState(preset._lowPass);
  const [hiPass, setHiPass] = useState(preset._hiPass);
  const [phaser, setPhaser] = useState(preset._phaser);
  const [reverb, setReverb] = useState(preset._reverb);
  const [compThreshold, setCompThreshold] = useState(preset._compThreshold);
  const [compRatio, setCompRatio] = useState(preset._compRatio);
  const [masterVolume, setMasterVolume] = useState(preset._masterVolume);

  // s l o t s
  const [attacks, setAttacks] = useState<number[]>(kit._attacks);
  const [releases, setReleases] = useState<number[]>(kit._releases);
  const [filters, setFilters] = useState<number[]>(kit._filters);
  const [volumes, setVolumes] = useState<number[]>(kit._volumes);
  const [pans, setPans] = useState<number[]>(kit._pans);
  const [mutes, setMutes] = useState<boolean[]>(kit._mutes);
  const [solos, setSolos] = useState<boolean[]>(kit._solos);
  const [pitches, setPitches] = useState<number[]>(kit._pitches);
  const [durations, setDurations] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0,
  ]);

  // r e f s
  const toneSequence = useRef<Tone.Sequence | null>(null);
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
            error
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
      makeGoodMusic(
        toneSequence,
        samples,
        releases,
        durations,
        chain,
        bar,
        chainVariation,
        solos,
        sequences,
        mutes,
        pitches,
        setStepIndex
      );
    }

    return () => {
      toneSequence.current?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, releases, chain, mutes, solos, samples, pitches]);

  // p r e s e t   c h a n g e
  useEffect(() => {
    if (!isLoading) setIsLoading(true);

    function setFromPreset(_preset: Preset) {
      setSlotIndex(0);
      setCurrentSequence(_preset._sequences[0][0][0]);
      setDurations([0, 0, 0, 0, 0, 0, 0, 0]);
      setVariation(0);
      setKit(_preset._kit);
      setSequences(_preset._sequences);
      setBpm(_preset._bpm);
      setSwing(_preset._swing);
      setLowPass(_preset._lowPass);
      setHiPass(_preset._hiPass);
      setPhaser(_preset._phaser);
      setReverb(_preset._reverb);
      setCompThreshold(_preset._compThreshold);
      setCompRatio(_preset._compRatio);
      setMasterVolume(_preset._masterVolume);
      setChain(_preset._chain);
    }

    setFromPreset({ ...preset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  // k i t   c h a n g e
  useEffect(() => {
    if (!isLoading) setIsLoading(true);

    const newSamples = createSamples(kit.samples);

    setSamples(newSamples);
    setAttacks(kit._attacks);
    setReleases(kit._releases);
    setFilters(kit._filters);
    setPans(kit._pans);
    setVolumes(kit._volumes);
    setSolos(kit._solos);
    setMutes(kit._mutes);

    // backwards compatibility for pitch params
    if (kit._pitches) {
      setPitches(kit._pitches);
    } else {
      // old save files
      setPitches([50, 50, 50, 50, 50, 50, 50, 50]);
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
            Tone.Destination
          );
        });
      }
    }
  }, [samples]);

  // t o g g l e   p l a y
  const togglePlay = async () => {
    if (Tone.context.state !== "running") {
      await Tone.start();
    }

    setIsPlaying((prevIsPlaying) => {
      if (!prevIsPlaying) {
        Tone.Transport.start();
      } else {
        Tone.Transport.stop();
        setStepIndex(0);
        samples.forEach((sample) => {
          sample.sampler.triggerRelease("C2", Tone.now());
        });
      }
      return !prevIsPlaying;
    });
  };

  // p l a y   f r o m   s p a c e b a r
  useEffect(() => {
    const playViaSpacebar = (event: KeyboardEvent) => {
      if (event.key === " " && !isModal) togglePlay();
    };

    document.addEventListener("keydown", playViaSpacebar);

    return () => {
      document.removeEventListener("keydown", playViaSpacebar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal]);

  // r e g i s t e r   s e r v i c e   w o r k e r
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log(
            "Service Worker registered with scope:",
            registration.scope
          );
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  // c o n t r o l   p r o p s
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    const newSwing = transformKnobValue(swing, [0, 0.5]);
    Tone.Transport.swingSubdivision = "16n";
    Tone.Transport.swing = newSwing;
  }, [swing]);

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

  useEffect(() => {
    const newCurrentSequence: boolean[] = sequences[slotIndex][variation][0];
    setCurrentSequence(newCurrentSequence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variation]);

  // m o b i l e   d e v i c e   w a r n i n g
  useEffect(() => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
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
              <Flex position="relative" h="120px" w="750px" flexDir="row">
                <Box h="90px" w="80px" my="20px">
                  <DrumhausLogo size={100} color="#ff7b00" />
                </Box>
                <Text
                  id="logo"
                  variant="logo"
                  fontSize={100}
                  color="darkorange"
                  fontFamily="Mandala"
                  fontWeight={900}
                  my="-12px"
                  h="120px"
                >
                  drumhaus
                </Text>
                <Box my="60px" ml={4}>
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
              <SlotsGrid
                samples={samples}
                variation={variation}
                sequences={sequences}
                setCurrentSequence={setCurrentSequence}
                slotIndex={slotIndex}
                setSlotIndex={setSlotIndex}
                attacks={attacks}
                setAttacks={setAttacks}
                releases={releases}
                setReleases={setReleases}
                filters={filters}
                setFilters={setFilters}
                volumes={volumes}
                setVolumes={setVolumes}
                pans={pans}
                setPans={setPans}
                mutes={mutes}
                setMutes={setMutes}
                solos={solos}
                setSolos={setSolos}
                pitches={pitches}
                setPitches={setPitches}
                setDurations={setDurations}
                isModal={isModal}
              />
            </Box>

            <Grid templateColumns="repeat(7, 1fr)" pl={4} py={4} w="100%">
              <GridItem colSpan={1} w="160px" mr={6}>
                <Center w="100%" h="100%">
                  <Button
                    h="140px"
                    w="140px"
                    onClick={() => togglePlay()}
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
                <SequencerControl
                  variation={variation}
                  setVariation={setVariation}
                  chain={chain}
                  setChain={setChain}
                  currentSequence={currentSequence}
                  setCurrentSequence={setCurrentSequence}
                  slot={slotIndex}
                  sequences={sequences}
                  setSequences={setSequences}
                />
              </GridItem>

              <GridItem colSpan={1} px={2}>
                <TransportControl
                  bpm={bpm}
                  setBpm={setBpm}
                  swing={swing}
                  setSwing={setSwing}
                />
              </GridItem>

              <GridItem w="380px" px={2}>
                <PresetControl
                  preset={preset}
                  setPreset={setPreset}
                  kit={kit}
                  setKit={setKit}
                  bpm={bpm}
                  swing={swing}
                  lowPass={lowPass}
                  hiPass={hiPass}
                  phaser={phaser}
                  reverb={reverb}
                  compThreshold={compThreshold}
                  compRatio={compRatio}
                  masterVolume={masterVolume}
                  sequences={sequences}
                  attacks={attacks}
                  releases={releases}
                  filters={filters}
                  volumes={volumes}
                  pans={pans}
                  solos={solos}
                  mutes={mutes}
                  chain={chain}
                  pitches={pitches}
                  isPlaying={isPlaying}
                  togglePlay={togglePlay}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  setIsModal={setIsModal}
                />
              </GridItem>

              <GridItem colSpan={1} w={120} pl={8} pr={4}>
                <MasterFX
                  lowPass={lowPass}
                  setLowPass={setLowPass}
                  hiPass={hiPass}
                  setHiPass={setHiPass}
                  phaser={phaser}
                  setPhaser={setPhaser}
                  reverb={reverb}
                  setReverb={setReverb}
                />
              </GridItem>

              <GridItem colSpan={1} px={4}>
                <MasterCompressor
                  threshold={compThreshold}
                  setThreshold={setCompThreshold}
                  ratio={compRatio}
                  setRatio={setCompRatio}
                />
              </GridItem>

              <GridItem colSpan={1} w={140}>
                <Knob
                  size={140}
                  knobValue={masterVolume}
                  setKnobValue={setMasterVolume}
                  knobTitle="MASTER VOLUME"
                  knobTransformRange={[-46, 4]}
                  knobUnits="dB"
                  defaultValue={92}
                />
              </GridItem>
            </Grid>

            <Box p={8} boxShadow="0 4px 8px rgba(176, 147, 116, 0.6)">
              <Sequencer
                sequence={currentSequence}
                setSequence={setCurrentSequence}
                sequences={sequences}
                setSequences={setSequences}
                variation={variation}
                slot={slotIndex}
                step={stepIndex}
                isPlaying={isPlaying}
              />
            </Box>

            <SignatureLogo
              width={50}
              fill="#B09374"
              position="absolute"
              right={6}
              bottom={8}
              opacity={0.3}
              as="a"
              href="https://www.maxfung.net/"
              target="_blank"
            />
          </Box>
          <Box h="20px" w="100%" position="relative">
            <Center w="100%" h="100%">
              <Flex mt={8}>
                <Text color="gray" fontSize={14}>
                  Designed with love by
                </Text>
                <Link
                  href="https://www.maxfung.net/"
                  target="_blank"
                  color="gray"
                  ml={1}
                  fontSize={14}
                >
                  Max Fung.
                </Link>
                <Link
                  href="https://forms.gle/txrvMfTczxe8Bg819"
                  target="_blank"
                  color="gray"
                  ml={1}
                  fontSize={14}
                >
                  Send feedback.
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
