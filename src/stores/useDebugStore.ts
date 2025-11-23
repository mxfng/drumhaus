import { create } from "zustand";

type DebugStoreType = {
  debugMode: boolean;
  toggleDebugMode: () => void;
  setDebugMode: (enabled: boolean) => void;
};

export const useDebugStore = create<DebugStoreType>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
  setDebugMode: (enabled) => set({ debugMode: enabled }),
}));
