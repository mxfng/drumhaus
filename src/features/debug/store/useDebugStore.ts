import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type DebugStoreType = {
  debugMode: boolean;
  toggleDebugMode: () => void;
  setDebugMode: (enabled: boolean) => void;
};

export const useDebugStore = create<DebugStoreType>()(
  devtools(
    persist(
      immer((set) => ({
        debugMode: false,
        toggleDebugMode: () => {
          set((state) => {
            state.debugMode = !state.debugMode;
          });
        },
        setDebugMode: (enabled) => {
          set({ debugMode: enabled });
        },
      })),
      {
        name: "drumhaus-debug-storage",
        version: 1,
        partialize: (state) => ({ debugMode: state.debugMode }),
      },
    ),
    {
      name: "DebugStore",
    },
  ),
);
