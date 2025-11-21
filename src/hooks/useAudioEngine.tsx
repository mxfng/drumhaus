import { useEffect, useRef, useState } from "react";
import type * as Tone from "tone/build/esm/index";

import {
  createDrumSequence,
  createInstrumentRuntimes,
  disposeDrumSequence,
  disposeInstrumentRuntimes,
  releaseNonSoloRuntimes,
  waitForBuffersToLoad,
} from "@/lib/audio/engine";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { useMasterChain } from "./useMasterChain";

interface UseAudioEngineResult {
  instrumentRuntimes: React.MutableRefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

export function useAudioEngine(): UseAudioEngineResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Audio engine refs (Tone.js runtime nodes)
  const instrumentRuntimes = useRef<InstrumentRuntime[]>([]);
  const [instrumentRuntimesVersion, setInstrumentRuntimesVersion] = useState(0);
  const toneSequence = useRef<Tone.Sequence | null>(null);
  const bar = useRef<number>(0);
  const chainVariation = useRef<number>(0);

  const isPlaying = useTransportStore((state) => state.isPlaying);
  const variationCycle = usePatternStore((state) => state.variationCycle);

  const instrumentSamplePaths = useInstrumentsStore((state) =>
    state.instruments.map((inst) => inst.sample.path).join(","),
  );

  useMasterChain({
    instrumentRuntimes: instrumentRuntimes.current,
    setIsLoading,
  });

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

  // When any instrument is soloed, immediately release all non-solo runtimes
  useEffect(() => {
    let prevSoloState = useInstrumentsStore
      .getState()
      .instruments.map((inst) => inst.params.solo);

    const unsubscribe = useInstrumentsStore.subscribe((state) => {
      const instruments = state.instruments;
      const solos = instruments.map((inst) => inst.params.solo);
      const hasSolo = solos.some(Boolean);
      const soloChanged = solos.some((val, idx) => val !== prevSoloState[idx]);

      if (hasSolo && soloChanged) {
        releaseNonSoloRuntimes(instruments, instrumentRuntimes.current);
      }

      prevSoloState = solos;
    });

    return unsubscribe;
  }, []);

  // Rebuild audio engine when samples change
  useEffect(() => {
    if (instrumentSamplePaths.length === 0) {
      return;
    }

    setIsLoading(true);

    const instruments = useInstrumentsStore.getState().instruments;

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

    void loadBuffers();

    return () => {
      disposeInstrumentRuntimes(instrumentRuntimes);
    };
  }, [instrumentSamplePaths]);

  return {
    instrumentRuntimes,
    instrumentRuntimesVersion,
    isLoading,
    setIsLoading,
  };
}
