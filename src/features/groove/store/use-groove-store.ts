import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface GrooveState {
  // UI preferences
  showVelocity: boolean;

  // Actions
  toggleShowVelocity: () => void;
  setShowVelocity: (show: boolean) => void;
}

export const useGrooveStore = create<GrooveState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        showVelocity: false,

        // Actions
        toggleShowVelocity: () => {
          set((state) => {
            state.showVelocity = !state.showVelocity;
          });
        },

        setShowVelocity: (show) => {
          set({ showVelocity: show });
        },
      })),

      {
        name: "drumhaus-groove-storage",
        version: 1,
        // Persist all state
        partialize: (state) => ({
          showVelocity: state.showVelocity,
        }),
      },
    ),
    {
      name: "GrooveStore",
    },
  ),
);
