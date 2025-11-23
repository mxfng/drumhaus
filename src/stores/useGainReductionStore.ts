import { create } from "zustand";

interface GainReductionState {
  reduction: number; // Current gain reduction in dB (negative value)
  setReduction: (reduction: number) => void;
}

export const useGainReductionStore = create<GainReductionState>()((set) => ({
  reduction: 0,
  setReduction: (reduction) => set({ reduction }),
}));
