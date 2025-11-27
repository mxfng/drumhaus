import { RefObject, useEffect, useRef, useState } from "react";

import {
  createDrumSequence,
  createInstrumentRuntimes,
  createSoloChangeHandler,
  disposeDrumSequence,
  disposeInstrumentRuntimes,
  releaseNonSoloRuntimes,
  waitForBuffersToLoad,
  type SequenceInstance,
} from "@/lib/audio/engine";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { useMasterChain } from "./useMasterChain";

interface UseAudioEngineResult {
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
}

export function useAudioEngine(): UseAudioEngineResult {
  // Audio engine refs (Tone.js runtime nodes)
  const instrumentRuntimes = useRef<InstrumentRuntime[]>([]);
  const [instrumentRuntimesVersion, setInstrumentRuntimesVersion] = useState(0);
  const toneSequence = useRef<SequenceInstance | null>(null);
  const bar = useRef<number>(0);
  const chainVariation = useRef<number>(0);

  const isPlaying = useTransportStore((state) => state.isPlaying);
  const variationCycle = usePatternStore((state) => state.variationCycle);

  const instrumentSamplePaths = useInstrumentsStore((state) =>
    state.instruments.map((inst) => inst.sample.path).join(","),
  );

  useMasterChain({
    instrumentRuntimesRef: instrumentRuntimes,
    instrumentRuntimesVersion,
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
    const soloHandler = createSoloChangeHandler(
      () => instrumentRuntimes.current,
      releaseNonSoloRuntimes,
    );

    // Initialize with current state
    soloHandler.getInitialState(useInstrumentsStore.getState().instruments);

    const unsubscribe = useInstrumentsStore.subscribe((state) => {
      soloHandler.handleStateChange(state.instruments);
    });

    return unsubscribe;
  }, []);

  // Rebuild audio engine when samples change
  useEffect(() => {
    if (instrumentSamplePaths.length === 0) {
      return;
    }

    let cancelled = false;

    const instruments = useInstrumentsStore.getState().instruments;

    const loadBuffers = async () => {
      try {
        await createInstrumentRuntimes(instrumentRuntimes, instruments);
        await waitForBuffersToLoad();
        if (cancelled) return;
        setInstrumentRuntimesVersion((v) => v + 1);
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading audio buffers:", error);
      }
    };

    void loadBuffers();

    return () => {
      cancelled = true;
      disposeInstrumentRuntimes(instrumentRuntimes);
    };
  }, [instrumentSamplePaths]);

  return {
    instrumentRuntimes,
    instrumentRuntimesVersion,
  };
}
