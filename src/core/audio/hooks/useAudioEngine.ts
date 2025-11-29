import { RefObject, useEffect, useRef, useState } from "react";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import {
  getMasterChainParams,
  useMasterChainStore,
} from "@/features/master-bus/store/useMasterChainStore";
import { MasterChainParams } from "@/features/master-bus/types/master";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import {
  connectInstrumentsToMasterChain,
  createDrumSequence,
  createInstrumentRuntimes,
  createMasterChainRuntimes,
  createSoloChangeHandler,
  disposeDrumSequence,
  disposeInstrumentRuntimes,
  disposeMasterChainRuntimes,
  MasterChainRuntimes,
  releaseNonSoloRuntimes,
  SequenceInstance,
  subscribeRuntimeToInstrumentParams,
  updateMasterChainParams,
  waitForBuffersToLoad,
} from "../engine";

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

  // Subscribe all instrument runtimes to their params
  useEffect(() => {
    const unsubscribers = instrumentRuntimes.current.map((runtime, index) =>
      subscribeRuntimeToInstrumentParams(index, runtime),
    );
    return () => unsubscribers.forEach((unsub) => unsub());
  }, [instrumentRuntimesVersion, instrumentRuntimes]);

  // --- Master Chain ---

  // Master Chain Runtimes
  const masterChainRuntimes = useRef<MasterChainRuntimes | null>(null);
  const isInitialized = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const setReduction = useMasterChainStore((state) => state.setReduction);

  // Initialize master chain runtimes once and set up subscription
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeMasterChain = async () => {
      // Get initial params without subscribing
      await createMasterChainRuntimes(
        masterChainRuntimes,
        getMasterChainParams(),
      );

      isInitialized.current = true;

      // Start gain reduction metering loop
      const updateGainReduction = () => {
        if (masterChainRuntimes.current) {
          const isPlaying = useTransportStore.getState().isPlaying;
          // Show 0 when not playing, otherwise show actual reduction
          const reduction = isPlaying
            ? masterChainRuntimes.current.compressor.reduction
            : 0;
          setReduction(reduction);
        }
        animationFrameRef.current = requestAnimationFrame(updateGainReduction);
      };
      animationFrameRef.current = requestAnimationFrame(updateGainReduction);

      // Set up subscription after initialization
      let prevParams: MasterChainParams | null = null;

      unsubscribeRef.current = useMasterChainStore.subscribe((state) => {
        if (!masterChainRuntimes.current) return;

        // Extract current params
        const currentParams: MasterChainParams = {
          lowPass: state.lowPass,
          highPass: state.highPass,
          phaser: state.phaser,
          reverb: state.reverb,
          compThreshold: state.compThreshold,
          compRatio: state.compRatio,
          compMix: state.compMix,
          masterVolume: state.masterVolume,
        };

        // Only update if params actually changed
        if (
          !prevParams ||
          prevParams.lowPass !== currentParams.lowPass ||
          prevParams.highPass !== currentParams.highPass ||
          prevParams.phaser !== currentParams.phaser ||
          prevParams.reverb !== currentParams.reverb ||
          prevParams.compThreshold !== currentParams.compThreshold ||
          prevParams.compRatio !== currentParams.compRatio ||
          prevParams.compMix !== currentParams.compMix ||
          prevParams.masterVolume !== currentParams.masterVolume
        ) {
          updateMasterChainParams(masterChainRuntimes.current, currentParams);
          prevParams = currentParams;
        }
      });
    };

    initializeMasterChain();

    return () => {
      // Clean up animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Clean up subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      // Only dispose on unmount, not on every instrument change
      if (isInitialized.current) {
        disposeMasterChainRuntimes(masterChainRuntimes);
        isInitialized.current = false;
      }
    };
  }, [setReduction]);

  // Connect instruments to master chain when they change
  useEffect(() => {
    if (!isInitialized.current || !masterChainRuntimes.current) return;

    connectInstrumentsToMasterChain(
      instrumentRuntimes.current,
      masterChainRuntimes.current,
    );
  }, [instrumentRuntimes, instrumentRuntimesVersion]);

  return {
    instrumentRuntimes,
    instrumentRuntimesVersion,
  };
}
