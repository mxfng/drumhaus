import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  MASTER_COMP_DEFAULT_MIX,
  MASTER_COMP_DEFAULT_RATIO,
  MASTER_COMP_DEFAULT_THRESHOLD,
  MASTER_DEFAULT_HIGH_PASS,
  MASTER_DEFAULT_LOW_PASS,
  MASTER_DEFAULT_PHASER,
  MASTER_DEFAULT_REVERB,
  MASTER_DEFAULT_VOLUME,
} from "@/lib/audio/engine/constants";
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

  // Runtime state (not persisted)
  reduction: number; // Current gain reduction in dB (negative value)

  // Actions
  setLowPass: (lowPass: number) => void;
  setHighPass: (highPass: number) => void;
  setPhaser: (phaser: number) => void;
  setReverb: (reverb: number) => void;
  setCompThreshold: (compThreshold: number) => void;
  setCompRatio: (compRatio: number) => void;
  setCompMix: (compMix: number) => void;
  setMasterVolume: (masterVolume: number) => void;
  setReduction: (reduction: number) => void;

  // Batch setters for preset loading
  setAllMasterChain: (params: MasterChainParams) => void;
}

export const useMasterChainStore = create<MasterChainState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state (default/init preset values)
        lowPass: MASTER_DEFAULT_LOW_PASS,
        highPass: MASTER_DEFAULT_HIGH_PASS,
        phaser: MASTER_DEFAULT_PHASER,
        reverb: MASTER_DEFAULT_REVERB,
        compThreshold: MASTER_COMP_DEFAULT_THRESHOLD,
        compRatio: MASTER_COMP_DEFAULT_RATIO,
        compMix: MASTER_COMP_DEFAULT_MIX,
        masterVolume: MASTER_DEFAULT_VOLUME,
        reduction: 0,

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

        setReduction: (reduction) => {
          set({ reduction });
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
            compMix: params.compMix ?? MASTER_COMP_DEFAULT_MIX,
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
