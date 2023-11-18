"use client";

import * as init from "@/lib/init";
import { Kit, Preset, Sample, SampleData, Sequences } from "@/types/types";
import {
  Box,
  Button,
  Center,
  Grid,
  GridItem,
  Heading,
  filter,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone/build/esm/index";
import { Sequencer } from "./Sequencer";
import { SlotsGrid } from "./SlotsGrid";
import { IoPlaySharp, IoPauseSharp } from "react-icons/io5";
import { TransportControl } from "./TransportControl";
import {
  Knob,
  transformKnobValue,
  transformKnobValueExponential,
} from "./Knob";
import { SequencerControl } from "./SequencerControl";
import { MasterFX } from "./MasterFX";
import { MasterCompressor } from "./MasterCompressor";
import { PresetControl } from "./PresetControl";

const Drumhaus = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState(0); // 0 - 15
  const [slotIndex, setSlotIndex] = useState<number>(0); // 0-7

  // Global
  const [preset, setPreset] = useState<Preset>({
    name: "init",
    _kit: init._kit,
    _bpm: init._bpm,
    _swing: init._swing,
    _lowPass: init._lowPass,
    _hiPass: init._hiPass,
    _phaser: init._phaser,
    _reverb: init._reverb,
    _compThreshold: init._compThreshold,
    _compRatio: init._compRatio,
    _masterVolume: init._masterVolume,
    _sequences: init._sequences,
    _attacks: init._attacks,
    _releases: init._releases,
    _filters: init._filters,
    _volumes: init._volumes,
    _pans: init._pans,
    _solos: init._solos,
    _mutes: init._mutes,
    _variation: init._variation,
    _chain: init._chain,
  });

  const [samples, setSamples] = useState<Sample[]>(init._samples);
  const [kit, setKit] = useState<Kit>(preset._kit);
  const [sequences, setSequences] = useState<Sequences>(preset._sequences);
  const [variation, setVariation] = useState<number>(preset._variation); // A = 0, B = 1
  const [chain, setChain] = useState<number>(preset._chain); // A = 0, B = 1, AB = 2, AAAB = 3
  const [currentSequence, setCurrentSequence] = useState<boolean[]>(
    preset._sequences[slotIndex][variation][0]
  );

  const [bpm, setBpm] = useState(preset._bpm);
  const [swing, setSwing] = useState(preset._swing);
  const [lowPass, setLowPass] = useState(preset._lowPass);
  const [hiPass, setHiPass] = useState(preset._hiPass);
  const [phaser, setPhaser] = useState(preset._phaser);
  const [reverb, setReverb] = useState(preset._reverb);
  const [compThreshold, setCompThreshold] = useState(preset._compThreshold);
  const [compRatio, setCompRatio] = useState(preset._compRatio);
  const [masterVolume, setMasterVolume] = useState(preset._masterVolume);

  // Slots - prop drilling (consider Redux in the future)
  const [attacks, setAttacks] = useState<number[]>(preset._attacks);
  const [releases, setReleases] = useState<number[]>(preset._releases);
  const [filters, setFilters] = useState<number[]>(preset._filters);
  const [volumes, setVolumes] = useState<number[]>(preset._volumes);
  const [pans, setPans] = useState<number[]>(preset._pans);
  const [mutes, setMutes] = useState<boolean[]>(preset._mutes);
  const [solos, setSolos] = useState<boolean[]>(preset._solos);
  const [durations, setDurations] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0,
  ]);

  const toneSequence = useRef<Tone.Sequence | null>(null);
  const toneLPFilter = useRef<Tone.Filter>();
  const toneHPFilter = useRef<Tone.Filter>();
  const tonePhaser = useRef<Tone.Phaser>();
  const toneReverb = useRef<Tone.Reverb>();
  const toneCompressor = useRef<Tone.Compressor>();

  useEffect(() => {
    function setFromPreset(_preset: Preset) {
      setKit(_preset._kit);
      setSequences(_preset._sequences);
      setCurrentSequence(_preset._sequences[0][0][0]);
      setBpm(_preset._bpm);
      setSwing(_preset._swing);
      setLowPass(_preset._lowPass);
      setHiPass(_preset._hiPass);
      setPhaser(_preset._phaser);
      setReverb(_preset._reverb);
      setCompThreshold(_preset._compThreshold);
      setCompRatio(_preset._compRatio);
      setMasterVolume(_preset._masterVolume);
      setAttacks(_preset._attacks);
      setReleases(_preset._releases);
      setFilters(_preset._filters);
      setVolumes(_preset._volumes);
      setPans(_preset._pans);
      setDurations([0, 0, 0, 0, 0, 0, 0, 0]);
      setVariation(_preset._variation);
      setChain(_preset._chain);
    }

    setFromPreset(preset);
  }, [preset]);

  // useEffect(() => {
  //   setPreset({
  //     name: "init",
  //     _kit: kit,
  //     _bpm: bpm,
  //     _swing: swing,
  //     _lowPass: lowPass,
  //     _hiPass: hiPass,
  //     _phaser: phaser,
  //     _reverb: reverb,
  //     _compThreshold: compThreshold,
  //     _compRatio: compRatio,
  //     _masterVolume: masterVolume,
  //     _sequences: sequences,
  //     _attacks: attacks,
  //     _releases: releases,
  //     _filters: filters,
  //     _volumes: volumes,
  //     _pans: pans,
  //     _solos: solos,
  //     _mutes: mutes,
  //     _variation: 0,
  //     _chain: chain,
  //   });
  // }, [
  //   kit,
  //   bpm,
  //   swing,
  //   lowPass,
  //   hiPass,
  //   phaser,
  //   reverb,
  //   compThreshold,
  //   compRatio,
  //   masterVolume,
  //   sequences,
  //   attacks,
  //   releases,
  //   filters,
  //   volumes,
  //   pans,
  //   solos,
  //   mutes,
  //   chain,
  // ]);

  useEffect(() => {
    const newSamples = init.createSamples(kit.samples);
    setSamples(newSamples);
  }, [kit]);

  useEffect(() => {
    let bar = 0;
    let chainVariation = 0;

    if (isPlaying) {
      toneSequence.current = new Tone.Sequence(
        (time, step: number) => {
          function triggerSample(slot: number, velocity: number) {
            samples[slot].sampler.triggerRelease("C2", time);
            if (samples[slot].name !== "OHat") {
              samples[slot].sampler.triggerRelease("C2", time);
              samples[slot].envelope.triggerAttack(time);
              samples[slot].envelope.triggerRelease(
                time + transformKnobValue(releases[slot], [0, durations[slot]])
              );
              samples[slot].sampler.triggerAttack("C2", time, velocity);
            } else {
              triggerOHat(velocity);
            }
          }

          function muteOHatOnHat(slot: number) {
            if (slot == 4) samples[5].sampler.triggerRelease("C2", time);
          }

          function triggerOHat(velocity: number) {
            samples[5].envelope.triggerAttack(time);
            samples[5].sampler.triggerAttack("C2", time, velocity);
          }

          const hasSolos = (solos: boolean[]) =>
            solos.some((value) => value === true);

          setVariationByChainAndBar();

          const anySolos = hasSolos(solos);

          for (let slot = 0; slot < sequences.length; slot++) {
            const hit: boolean = sequences[slot][chainVariation][0][step];
            const isSolo = solos[slot];
            if (anySolos && !isSolo) {
              continue;
            } else if (hit && !mutes[slot]) {
              const velocity: number = sequences[slot][chainVariation][1][step];
              muteOHatOnHat(slot);
              triggerSample(slot, velocity);
            }
          }

          setStepIndex(step);
          setBarByChain();

          function setBarByChain() {
            if (step === 15) {
              if (
                chain < 2 ||
                (chain === 2 && bar === 1) ||
                (chain === 3 && bar === 3)
              ) {
                bar = 0;
              } else {
                bar++;
              }
            }
          }

          function setVariationByChainAndBar() {
            if (step === 0) {
              switch (chain) {
                case 0:
                  chainVariation = 0;
                  break;
                case 1:
                  chainVariation = 1;
                  break;
                case 2:
                  chainVariation = bar === 0 ? 0 : 1;
                  break;
                case 3:
                  chainVariation = bar === 3 ? 1 : 0;
                  break;
                default:
                  chainVariation = 0;
              }
            }
          }
        },
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        "16n"
      ).start(0);
    }

    return () => {
      toneSequence.current?.dispose();
    };
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequences, isPlaying, releases, chain, mutes, solos, samples]);

  useEffect(() => {
    const playViaSpacebar = (event: KeyboardEvent) => {
      if (event.key === " ") togglePlay();
    };

    document.addEventListener("keydown", playViaSpacebar);

    return () => {
      document.removeEventListener("keydown", playViaSpacebar);
    };
  }, []);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    const newSwing = transformKnobValue(swing, [0, 0.5]);
    Tone.Transport.swingSubdivision = "16n";
    Tone.Transport.swing = newSwing;
  }, [swing]);

  useEffect(() => {
    setMasterChain();

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
        frequency: 5,
        octaves: 4,
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
  }, [masterVolume]);

  useEffect(() => {
    const newCurrentSequence: boolean[] = sequences[slotIndex][variation][0];
    setCurrentSequence(newCurrentSequence);
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variation]);

  const togglePlay = async () => {
    await Tone.start();

    setIsPlaying((prevIsPlaying) => {
      if (!prevIsPlaying) Tone.Transport.start();
      else Tone.Transport.stop();
      return !prevIsPlaying;
    });
  };

  return (
    <Box
      id="Drumhaus"
      className="drumhaus"
      bg="silver"
      minW={1538}
      w={1538}
      h={1000}
      style={{ userSelect: "none" }}
      borderRadius="12px"
      boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
    >
      <Box boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)">
        <Heading
          id="logo"
          variant="logo"
          as="h1"
          fontSize={100}
          color="darkorange"
          fontFamily="Mandala"
          px={6}
        >
          drumhaus
        </Heading>
      </Box>

      <Box boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)">
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
          setDurations={setDurations}
        />
      </Box>

      <Grid templateColumns="repeat(7, 1fr)" px={4} py={6} w="100%">
        <GridItem colSpan={1} w="160px">
          <Center w="100%" h="100%">
            <Button
              h="140px"
              w="140px"
              onClick={() => togglePlay()}
              boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)"
              bg="silver"
              outline="none"
            >
              {isPlaying ? (
                <IoPauseSharp size={50} color="darkorange" />
              ) : (
                <IoPlaySharp size={50} color="darkorange" />
              )}
            </Button>
          </Center>
        </GridItem>

        <GridItem colSpan={1}>
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

        <GridItem colSpan={1}>
          <TransportControl
            bpm={bpm}
            setBpm={setBpm}
            swing={swing}
            setSwing={setSwing}
          />
        </GridItem>

        <GridItem w="380px" pl={0} pr={6}>
          <PresetControl
            preset={preset}
            setPreset={setPreset}
            samples={samples}
            setSamples={setSamples}
          />
        </GridItem>

        <GridItem colSpan={1} w={120}>
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

        <GridItem colSpan={1}>
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
          />
        </GridItem>
      </Grid>

      <Box p={8} boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)">
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
    </Box>
  );
};

export default Drumhaus;
