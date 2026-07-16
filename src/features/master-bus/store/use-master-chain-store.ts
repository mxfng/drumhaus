import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// No persist middleware: master-chain settings persist inside the session
// document (features/preset/session), restored by bootstrapSession() before
// React mounts.

import type { MasterChainCanonical } from "@/core/audio/bridge/engine-params";
import { MASTER_COMP_ATTACK_DEFAULT } from "@/core/audio/engine/constants";

/**
 * Canonical master-chain defaults (docs/data-representation.md): the units the
 * engine hears, not 0-100 knob positions. These are the init preset's values;
 * bootstrapSession applies a document before React mounts, so this literal is
 * only the transient pre-boot state. Filter `{ highpass, 0 }` is fully open.
 */
const DEFAULT_MASTER_CHAIN: MasterChainCanonical = {
  filter: { side: "highpass", cutoffHz: 0 },
  saturation: 0,
  phaser: 0,
  reverb: 0,
  compThreshold: 0, // dB
  compRatio: 5,
  compAttack: MASTER_COMP_ATTACK_DEFAULT, // seconds
  compMix: 0.7,
  masterVolume: 0, // dB
};

/**
 * Selector to read the canonical master-chain params from the store state.
 */
function getMasterChainParams(): MasterChainCanonical {
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

interface MasterChainState extends MasterChainCanonical {
  // Actions
  setFilter: (filter: MasterChainCanonical["filter"]) => void;
  setSaturation: (saturation: number) => void;
  setPhaser: (phaser: number) => void;
  setReverb: (reverb: number) => void;
  setCompThreshold: (compThreshold: number) => void;
  setCompRatio: (compRatio: number) => void;
  setCompAttack: (compAttack: number) => void;
  setCompMix: (compMix: number) => void;
  setMasterVolume: (masterVolume: number) => void;

  // Batch setter for preset loading
  setAllMasterChain: (params: MasterChainCanonical) => void;
}

const useMasterChainStore = create<MasterChainState>()(
  devtools(
    immer((set) => ({
      // Initial state (canonical init-preset values)
      ...DEFAULT_MASTER_CHAIN,

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
          compMix: params.compMix,
          masterVolume: params.masterVolume,
        });
      },
    })),
    {
      name: "MasterChainStore",
    },
  ),
);

export { DEFAULT_MASTER_CHAIN, getMasterChainParams, useMasterChainStore };
