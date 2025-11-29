import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type PerformanceState = {
  potatoMode: boolean;
  setPotatoMode: (enabled: boolean) => void;
  togglePotatoMode: () => void;
};

export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    persist(
      immer((set) => ({
        potatoMode: false,
        setPotatoMode: (enabled) => {
          set((state) => {
            state.potatoMode = enabled;
          });
        },
        togglePotatoMode: () => {
          set((state) => {
            state.potatoMode = !state.potatoMode;
          });
        },
      })),
      { name: "drumhaus-performance-store" },
    ),
    { name: "PerformanceStore" },
  ),
);
