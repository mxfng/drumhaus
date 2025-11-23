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
  MASTER_INFLATOR_AMOUNT_DEFAULT,
  MASTER_SATURATION_DRIVE_DEFAULT,
  MASTER_TAPE_DRIVE_DEFAULT,
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
    tapeDrive: state.tapeDrive,
    inflatorAmount: state.inflatorAmount,
    saturationDrive: state.saturationDrive,
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

  // Character processors
  tapeDrive: number;
  inflatorAmount: number;
  saturationDrive: number;

  // Master output
  masterVolume: number;

  // Runtime state (not persisted)
  reduction: number; // Current gain reduction in dB (negative value)
  outputLevel: number; // Current post-limiter level in dBFS

  // Actions
  setLowPass: (lowPass: number) => void;
  setHighPass: (highPass: number) => void;
  setPhaser: (phaser: number) => void;
  setReverb: (reverb: number) => void;
  setCompThreshold: (compThreshold: number) => void;
  setCompRatio: (compRatio: number) => void;
  setCompMix: (compMix: number) => void;
  setTapeDrive: (tapeDrive: number) => void;
  setInflatorAmount: (inflatorAmount: number) => void;
  setSaturationDrive: (saturationDrive: number) => void;
  setMasterVolume: (masterVolume: number) => void;
  setReduction: (reduction: number) => void;
  setOutputLevel: (outputLevel: number) => void;

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
        tapeDrive: MASTER_TAPE_DRIVE_DEFAULT,
        inflatorAmount: MASTER_INFLATOR_AMOUNT_DEFAULT,
        saturationDrive: MASTER_SATURATION_DRIVE_DEFAULT,
        masterVolume: MASTER_DEFAULT_VOLUME,
        reduction: 0,
        outputLevel: Number.NEGATIVE_INFINITY,

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

        setTapeDrive: (tapeDrive) => {
          set({ tapeDrive });
        },

        setInflatorAmount: (inflatorAmount) => {
          set({ inflatorAmount });
        },

        setSaturationDrive: (saturationDrive) => {
          set({ saturationDrive });
        },

        setMasterVolume: (masterVolume) => {
          set({ masterVolume });
        },

        setReduction: (reduction) => {
          set({ reduction });
        },

        setOutputLevel: (outputLevel) => {
          set({ outputLevel });
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
            tapeDrive: params.tapeDrive ?? MASTER_TAPE_DRIVE_DEFAULT,
            inflatorAmount:
              params.inflatorAmount ?? MASTER_INFLATOR_AMOUNT_DEFAULT,
            saturationDrive:
              params.saturationDrive ?? MASTER_SATURATION_DRIVE_DEFAULT,
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
          tapeDrive: state.tapeDrive,
          inflatorAmount: state.inflatorAmount,
          saturationDrive: state.saturationDrive,
          masterVolume: state.masterVolume,
        }),
      },
    ),
    {
      name: "MasterChainStore",
    },
  ),
);
