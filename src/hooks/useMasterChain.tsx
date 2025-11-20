import { useEffect, useRef } from "react";

import {
  connectInstrumentsToMasterChain,
  createMasterChainRuntimes,
  disposeMasterChainRuntimes,
  updateMasterChainParams,
  type MasterChainParams,
  type MasterChainRuntimes,
} from "@/lib/audio/engine";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import type { InstrumentRuntime } from "@/types/instrument";

interface UseMasterChainProps {
  instrumentRuntimes: InstrumentRuntime[];
  setIsLoading: (isLoading: boolean) => void;
}

export function useMasterChain({
  instrumentRuntimes,
  setIsLoading,
}: UseMasterChainProps) {
  // Master Chain Runtimes
  const masterChainRuntimes = useRef<MasterChainRuntimes | null>(null);
  const isInitialized = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize master chain runtimes once and set up subscription
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeMasterChain = async () => {
      // Get initial params without subscribing
      const initialState = useMasterChainStore.getState();
      await createMasterChainRuntimes(masterChainRuntimes, {
        lowPass: initialState.lowPass,
        highPass: initialState.highPass,
        phaser: initialState.phaser,
        reverb: initialState.reverb,
        compThreshold: initialState.compThreshold,
        compRatio: initialState.compRatio,
        masterVolume: initialState.masterVolume,
      });

      isInitialized.current = true;
      setIsLoading(false);

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
          prevParams.masterVolume !== currentParams.masterVolume
        ) {
          updateMasterChainParams(masterChainRuntimes.current, currentParams);
          prevParams = currentParams;
        }
      });
    };

    initializeMasterChain();

    return () => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect instruments to master chain when they change
  useEffect(() => {
    if (!isInitialized.current || !masterChainRuntimes.current) return;

    connectInstrumentsToMasterChain(
      instrumentRuntimes,
      masterChainRuntimes.current,
    );
  }, [instrumentRuntimes]);
}
