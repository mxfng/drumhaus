import { RefObject, useEffect, useRef } from "react";

import {
  connectInstrumentsToMasterChain,
  createMasterChainRuntimes,
  disposeMasterChainRuntimes,
  updateMasterChainParams,
  type MasterChainRuntimes,
} from "@/lib/audio/engine";
import { useGainReductionStore } from "@/stores/useGainReductionStore";
import {
  getMasterChainParams,
  useMasterChainStore,
} from "@/stores/useMasterChainStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { MasterChainParams } from "@/types/preset";

interface UseMasterChainProps {
  instrumentRuntimesRef: RefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
}

export function useMasterChain({
  instrumentRuntimesRef,
  instrumentRuntimesVersion,
}: UseMasterChainProps) {
  // Master Chain Runtimes
  const masterChainRuntimes = useRef<MasterChainRuntimes | null>(null);
  const isInitialized = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const setReduction = useGainReductionStore((state) => state.setReduction);

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
      instrumentRuntimesRef.current,
      masterChainRuntimes.current,
    );
  }, [instrumentRuntimesRef, instrumentRuntimesVersion]);
}
