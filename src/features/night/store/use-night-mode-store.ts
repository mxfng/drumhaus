import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NightModeStore {
  nightMode: boolean;
  toggleNightMode: () => void;
}

export const useNightModeStore = create<NightModeStore>()(
  persist(
    (set) => ({
      nightMode: false,
      toggleNightMode: () => set((state) => ({ nightMode: !state.nightMode })),
    }),
    {
      name: "drumhaus-night-mode",
    },
  ),
);
