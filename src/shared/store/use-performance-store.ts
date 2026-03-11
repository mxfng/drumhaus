import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type PerformanceState = {
  potatoMode: boolean;
  setPotatoMode: (enabled: boolean) => void;
  togglePotatoMode: () => void;
};

const syncPotatoModeClass = (enabled: boolean) => {
  if (typeof document === "undefined") return;

  const targets: Array<HTMLElement | null> = [
    document.documentElement,
    document.body,
    document.getElementById("root"),
  ];

  targets.forEach((el) => {
    el?.classList.toggle("potato-mode", enabled);
  });
};

export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    persist(
      immer((set) => ({
        potatoMode: false,
        setPotatoMode: (enabled) => {
          set((state) => {
            state.potatoMode = enabled;
            syncPotatoModeClass(enabled);
          });
        },
        togglePotatoMode: () => {
          set((state) => {
            const nextPotatoMode = !state.potatoMode;
            state.potatoMode = nextPotatoMode;
            syncPotatoModeClass(nextPotatoMode);
          });
        },
      })),
      {
        name: "drumhaus-performance-store",
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          syncPotatoModeClass(state.potatoMode);
        },
      },
    ),
    { name: "PerformanceStore" },
  ),
);
