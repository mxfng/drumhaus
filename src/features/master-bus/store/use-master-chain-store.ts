import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  MASTER_COMP_DEFAULT_ATTACK,
  MASTER_COMP_DEFAULT_MIX,
  MASTER_COMP_DEFAULT_RATIO,
  MASTER_COMP_DEFAULT_THRESHOLD,
  MASTER_FILTER_DEFAULT,
  MASTER_PHASER_DEFAULT,
  MASTER_REVERB_DEFAULT,
  MASTER_SATURATION_DEFAULT,
  MASTER_VOLUME_DEFAULT,
} from "@/core/audio/engine/constants";
import { MasterChainParams } from "@/core/audio/engine/fx/masterChain/types";

/**
 * Selector to get MasterChainParams from the store state
 */
export function getMasterChainParams(): MasterChainParams {
  const state = useMasterChainStore.getState();
  return {
    filter: state.filter,
    saturation: state.saturation,
    phaser: state.phaser,
    reverb: state.reverb,
    compThreshold: state.compThreshold,
    compRatio: state.compRatio,
    compAttack: state.compAttack,
    compMix: state.compMix,
    masterVolume: state.masterVolume,
  };
}

interface MasterChainState {
  // Filter effects
  filter: number;
  saturation: number;
  phaser: number;
  reverb: number;

  // Compressor
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compMix: number;

  // Master output
  masterVolume: number;

  // Actions
  setFilter: (filter: number) => void;
  setSaturation: (saturation: number) => void;
  setPhaser: (phaser: number) => void;
  setReverb: (reverb: number) => void;
  setCompThreshold: (compThreshold: number) => void;
  setCompRatio: (compRatio: number) => void;
  setCompAttack: (compAttack: number) => void;
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
        filter: MASTER_FILTER_DEFAULT,
        saturation: MASTER_SATURATION_DEFAULT,
        phaser: MASTER_PHASER_DEFAULT,
        reverb: MASTER_REVERB_DEFAULT,
        compThreshold: MASTER_COMP_DEFAULT_THRESHOLD,
        compRatio: MASTER_COMP_DEFAULT_RATIO,
        compAttack: MASTER_COMP_DEFAULT_ATTACK,
        compMix: MASTER_COMP_DEFAULT_MIX,
        masterVolume: MASTER_VOLUME_DEFAULT,

        // Individual setters
        setFilter: (filter) => {
          set({ filter });
        },

        setSaturation: (saturation) => {
          set({ saturation });
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

        setCompAttack: (compAttack) => {
          set({ compAttack });
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
            filter: params.filter,
            saturation: params.saturation,
            phaser: params.phaser,
            reverb: params.reverb,
            compThreshold: params.compThreshold,
            compRatio: params.compRatio,
            compAttack: params.compAttack,
            compMix: params.compMix ?? MASTER_COMP_DEFAULT_MIX,
            masterVolume: params.masterVolume,
          });
        },
      })),
      {
        name: "drumhaus-master-chain-storage",
        // Persist all master FX settings
        partialize: (state) => ({
          filter: state.filter,
          saturation: state.saturation,
          phaser: state.phaser,
          reverb: state.reverb,
          compThreshold: state.compThreshold,
          compRatio: state.compRatio,
          compAttack: state.compAttack,
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
