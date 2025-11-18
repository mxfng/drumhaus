import { useEffect, useRef } from "react";
import * as Tone from "tone/build/esm/index";

import {
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/Knob";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { InstrumentRuntime } from "@/types/instrument";

interface UseMasterChainProps {
  instrumentRuntimes: InstrumentRuntime[];
  setIsLoading: (isLoading: boolean) => void;
}

export function useMasterChain({
  instrumentRuntimes,
  setIsLoading,
}: UseMasterChainProps) {
  // Master Chain values
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

  const isInitialized = useRef(false);

  // Initialize master chain nodes once
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeMasterChain = async () => {
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

      // Reverb needs async initialization
      toneReverb.current = new Tone.Reverb({
        decay: newReverbDecay,
        wet: newReverbWet,
      });
      await toneReverb.current.generate();

      toneCompressor.current = new Tone.Compressor({
        threshold: newCompThreshold,
        ratio: newCompRatio,
        attack: 0.5,
        release: 1,
      });

      isInitialized.current = true;
      setIsLoading(false);
    };

    initializeMasterChain();

    return () => {
      // Only dispose on unmount, not on every instrument change
      if (isInitialized.current) {
        toneLPFilter.current?.dispose();
        toneHPFilter.current?.dispose();
        tonePhaser.current?.dispose();
        toneReverb.current?.dispose();
        toneCompressor.current?.dispose();
        isInitialized.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect instruments to master chain when they change
  useEffect(() => {
    if (!isInitialized.current) return;

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
          toneLPFilter.current!,
          toneHPFilter.current!,
          tonePhaser.current!,
          toneReverb.current!,
          toneCompressor.current!,
          Tone.Destination,
        );
      });
    }
  }, [instrumentRuntimes]);

  // Update parameters on existing nodes

  useEffect(() => {
    if (!toneLPFilter.current) return;
    toneLPFilter.current.frequency.value = transformKnobValueExponential(
      lowPass,
      [0, 15000],
    );
  }, [lowPass]);

  useEffect(() => {
    if (!toneHPFilter.current) return;
    toneHPFilter.current.frequency.value = transformKnobValueExponential(
      hiPass,
      [0, 15000],
    );
  }, [hiPass]);

  useEffect(() => {
    if (!tonePhaser.current) return;
    tonePhaser.current.wet.value = transformKnobValue(phaser, [0, 1]);
  }, [phaser]);

  useEffect(() => {
    if (!toneReverb.current) return;
    toneReverb.current.wet.value = transformKnobValue(reverb, [0, 0.5]);
    toneReverb.current.decay = transformKnobValue(reverb, [0.1, 3]);
  }, [reverb]);

  useEffect(() => {
    if (!toneCompressor.current) return;
    toneCompressor.current.threshold.value = transformKnobValue(
      compThreshold,
      [-40, 0],
    );
  }, [compThreshold]);

  useEffect(() => {
    if (!toneCompressor.current) return;
    toneCompressor.current.ratio.value = Math.floor(
      transformKnobValue(compRatio, [1, 8]),
    );
  }, [compRatio]);

  useEffect(() => {
    Tone.Destination.volume.value = transformKnobValue(masterVolume, [-46, 4]);
  }, [masterVolume]);
}
