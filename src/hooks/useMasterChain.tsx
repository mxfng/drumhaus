import { useEffect, useRef } from "react";
import * as Tone from "tone/build/esm/index";

import {
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/Knob";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { InstrumentRuntime } from "@/types/types";

interface UseMasterChainProps {
  instrumentRuntimes: InstrumentRuntime[];
  setIsLoading: (isLoading: boolean) => void;
}

export function useMasterChain({
  instrumentRuntimes,
  setIsLoading,
}: UseMasterChainProps) {
  // Master Chain
  const lowPass = useMasterChainStore((state) => state.lowPass);
  const hiPass = useMasterChainStore((state) => state.hiPass);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);
  const compThreshold = useMasterChainStore((state) => state.compThreshold);
  const compRatio = useMasterChainStore((state) => state.compRatio);
  const masterVolume = useMasterChainStore((state) => state.masterVolume);

  // Master Chain Nodes
  const toneLPFilter = useRef<Tone.Filter>();
  const toneHPFilter = useRef<Tone.Filter>();
  const tonePhaser = useRef<Tone.Phaser>();
  const toneReverb = useRef<Tone.Reverb>();
  const toneCompressor = useRef<Tone.Compressor>();

  // Set new master chain nodes to instrument runtimes when instruments change
  useEffect(() => {
    function setMasterChain() {
      const newLowPass = transformKnobValueExponential(lowPass, [0, 15000]);
      const newHiPass = transformKnobValueExponential(hiPass, [0, 15000]);
      const newPhaserWet = transformKnobValue(phaser, [0, 1]);
      const newReverbWet = transformKnobValue(reverb, [0, 0.5]);
      const newReverbDecay = transformKnobValue(reverb, [0.1, 3]);
      const newCompThreshold = transformKnobValue(compThreshold, [-40, 0]);
      const newCompRatio = Math.floor(transformKnobValue(compRatio, [1, 8]));

      toneLPFilter.current = new Tone.Filter(newLowPass, "lowpass");
      toneHPFilter.current = new Tone.Filter(newHiPass, "highpass");
      tonePhaser.current = new Tone.Phaser({
        frequency: 1,
        octaves: 3,
        baseFrequency: 1000,
        wet: newPhaserWet,
      });
      toneReverb.current = new Tone.Reverb({
        decay: newReverbDecay,
        wet: newReverbWet,
      });
      toneCompressor.current = new Tone.Compressor({
        threshold: newCompThreshold,
        ratio: newCompRatio,
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
        instrumentRuntimes.forEach((runtime) => {
          runtime.samplerNode.chain(
            runtime.envelopeNode,
            runtime.filterNode,
            runtime.pannerNode,
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

    setMasterChain();
    setIsLoading(false);

    return () => {
      toneLPFilter.current?.dispose();
      toneHPFilter.current?.dispose();
      tonePhaser.current?.dispose();
      toneReverb.current?.dispose();
      toneCompressor.current?.dispose();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrumentRuntimes]);

  // Listeners for master chain input changes

  useEffect(() => {
    const newLowPass = transformKnobValueExponential(lowPass, [0, 15000]);
    if (toneLPFilter.current) {
      toneLPFilter.current.frequency.value = newLowPass;
    }
  }, [lowPass]);

  useEffect(() => {
    const newHiPass = transformKnobValueExponential(hiPass, [0, 15000]);
    if (toneHPFilter.current) {
      toneHPFilter.current.frequency.value = newHiPass;
    }
  }, [hiPass]);

  useEffect(() => {
    const newPhaserWet = transformKnobValue(phaser, [0, 1]);
    if (tonePhaser.current) {
      tonePhaser.current.wet.value = newPhaserWet;
    }
  }, [phaser]);

  useEffect(() => {
    const newReverbWet = transformKnobValue(reverb, [0, 0.5]);
    const newReverbDecay = transformKnobValue(reverb, [0.1, 3]);
    if (toneReverb.current) {
      toneReverb.current.wet.value = newReverbWet;
      toneReverb.current.decay = newReverbDecay;
    }
  }, [reverb]);

  useEffect(() => {
    const newCompThreshold = transformKnobValue(compThreshold, [-40, 0]);
    if (toneCompressor.current) {
      toneCompressor.current.threshold.value = newCompThreshold;
    }
  }, [compThreshold]);

  useEffect(() => {
    const newCompRatio = Math.floor(transformKnobValue(compRatio, [1, 8]));
    if (toneCompressor.current) {
      toneCompressor.current.ratio.value = newCompRatio;
    }
  }, [compRatio]);

  useEffect(() => {
    const newMasterVolume = transformKnobValue(masterVolume, [-46, 4]);
    Tone.Destination.volume.value = newMasterVolume;
  }, [masterVolume]);
}
