import { useEffect, useRef } from "react";

import {
  connectInstrumentsToMasterChain,
  createMasterChainRuntimes,
  disposeMasterChainRuntimes,
  updateMasterChainParams,
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
  // Master Chain values
  const lowPass = useMasterChainStore((state) => state.lowPass);
  const hiPass = useMasterChainStore((state) => state.hiPass);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);
  const compThreshold = useMasterChainStore((state) => state.compThreshold);
  const compRatio = useMasterChainStore((state) => state.compRatio);
  const masterVolume = useMasterChainStore((state) => state.masterVolume);

  // Master Chain Runtimes
  const masterChainRuntimes = useRef<MasterChainRuntimes | null>(null);
  const isInitialized = useRef(false);

  // Initialize master chain runtimes once
  useEffect(() => {
    if (isInitialized.current) return;

    const initializeMasterChain = async () => {
      await createMasterChainRuntimes(masterChainRuntimes, {
        lowPass,
        hiPass,
        phaser,
        reverb,
        compThreshold,
        compRatio,
        masterVolume,
      });

      isInitialized.current = true;
      setIsLoading(false);
    };

    initializeMasterChain();

    return () => {
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

  // Update parameters on existing runtimes
  useEffect(() => {
    if (!masterChainRuntimes.current) return;
    updateMasterChainParams(masterChainRuntimes.current, {
      lowPass,
      hiPass,
      phaser,
      reverb,
      compThreshold,
      compRatio,
      masterVolume,
    });
  }, [lowPass, hiPass, phaser, reverb, compThreshold, compRatio, masterVolume]);
}
