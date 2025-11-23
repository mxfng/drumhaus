import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { MasterChainParams } from "@/types/preset";

/**
 * Selector to get MasterChainParams from the store state
 */
export function getMasterChainParams(): MasterChainParams {
  const state = useMasterChainStore.getState();
  return {
    lowPass: state.lowPass,
    highPass: state.highPass,
    phaser: state.phaser,
    reverb: state.reverb,
    compThreshold: state.compThreshold,
    compRatio: state.compRatio,
    compMix: state.compMix,
    masterVolume: state.masterVolume,
  };
}

interface MasterChainState {
  // Filter effects
  lowPass: number;
  highPass: number;
  phaser: number;
  reverb: number;

  // Compressor
  compThreshold: number;
  compRatio: number;
  compMix: number;

  // Master output
  masterVolume: number;

  // Actions
  setLowPass: (lowPass: number) => void;
  setHighPass: (highPass: number) => void;
  setPhaser: (phaser: number) => void;
  setReverb: (reverb: number) => void;
  setCompThreshold: (compThreshold: number) => void;
  setCompRatio: (compRatio: number) => void;
  setCompMix: (compMix: number) => void;
  setMasterVolume: (masterVolume: number) => void;

  // Batch setters for preset loading
  setAllMasterChain: (params: MasterChainParams) => void;
}

export const useMasterChainStore = create<MasterChainState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state (default/init preset values)
        lowPass: 100,
        highPass: 0,
        phaser: 0,
        reverb: 0,
        compThreshold: 50,
        compRatio: 50,
        compMix: 70, // API 2500 style: 70% wet for parallel compression
        masterVolume: 92,

        // Individual setters
        setLowPass: (lowPass) => {
          set({ lowPass });
        },

        setHighPass: (highPass) => {
          set({ highPass });
        },

        setPhaser: (phaser) => {
          set({ phaser });
        },

        setReverb: (reverb) => {
          set({ reverb });
        },

        setCompThreshold: (compThreshold) => {
          set({ compThreshold });
        },

        setCompRatio: (compRatio) => {
          set({ compRatio });
        },

        setCompMix: (compMix) => {
          set({ compMix });
        },

        setMasterVolume: (masterVolume) => {
          set({ masterVolume });
        },

        // Batch setter for preset loading
        setAllMasterChain: (params) => {
          set({
            lowPass: params.lowPass,
            highPass: params.highPass,
            phaser: params.phaser,
            reverb: params.reverb,
            compThreshold: params.compThreshold,
            compRatio: params.compRatio,
            compMix: params.compMix,
            masterVolume: params.masterVolume,
          });
        },
      })),
      {
        name: "drumhaus-master-chain-storage",
        // Persist all master FX settings
        partialize: (state) => ({
          lowPass: state.lowPass,
          highPass: state.highPass,
          phaser: state.phaser,
          reverb: state.reverb,
          compThreshold: state.compThreshold,
          compRatio: state.compRatio,
          compMix: state.compMix,
          masterVolume: state.masterVolume,
        }),
      },
    ),
    {
      name: "MasterChainStore",
    },
  ),
);
