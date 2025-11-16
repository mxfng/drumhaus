import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface MasterFXState {
  // Filter effects
  lowPass: number;
  hiPass: number;
  phaser: number;
  reverb: number;

  // Compressor
  compThreshold: number;
  compRatio: number;

  // Master output
  masterVolume: number;

  // Actions
  setLowPass: (lowPass: number) => void;
  setHiPass: (hiPass: number) => void;
  setPhaser: (phaser: number) => void;
  setReverb: (reverb: number) => void;
  setCompThreshold: (compThreshold: number) => void;
  setCompRatio: (compRatio: number) => void;
  setMasterVolume: (masterVolume: number) => void;

  // Batch setters for preset loading
  setAllMasterFX: (
    lowPass: number,
    hiPass: number,
    phaser: number,
    reverb: number,
    compThreshold: number,
    compRatio: number,
    masterVolume: number
  ) => void;
}

export const useMasterFXStore = create<MasterFXState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state (default/init preset values)
        lowPass: 100,
        hiPass: 0,
        phaser: 0,
        reverb: 0,
        compThreshold: 50,
        compRatio: 50,
        masterVolume: 92,

        // Individual setters
        setLowPass: (lowPass) => {
          set({ lowPass });
        },

        setHiPass: (hiPass) => {
          set({ hiPass });
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

        setMasterVolume: (masterVolume) => {
          set({ masterVolume });
        },

        // Batch setter for preset loading
        setAllMasterFX: (
          lowPass,
          hiPass,
          phaser,
          reverb,
          compThreshold,
          compRatio,
          masterVolume
        ) => {
          set({
            lowPass,
            hiPass,
            phaser,
            reverb,
            compThreshold,
            compRatio,
            masterVolume,
          });
        },
      })),
      {
        name: "drumhaus-master-fx-storage",
        // Persist all master FX settings
        partialize: (state) => ({
          lowPass: state.lowPass,
          hiPass: state.hiPass,
          phaser: state.phaser,
          reverb: state.reverb,
          compThreshold: state.compThreshold,
          compRatio: state.compRatio,
          masterVolume: state.masterVolume,
        }),
      }
    ),
    {
      name: "MasterFXStore",
    }
  )
);
