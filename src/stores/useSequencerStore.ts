import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createEmptyPattern } from "@/lib/pattern/migrate";
import { Pattern } from "@/lib/pattern/types";

interface SequencerState {
  // Pattern data - 8 voices, each with instrumentIndex and 2 variations
  pattern: Pattern;

  // Sequencer controls
  variation: number; // A = 0, B = 1
  chain: number; // A = 0, B = 1, AB = 2, AAAB = 3
  voiceIndex: number; // Currently selected voice (0-7)

  // Actions
  setVariation: (variation: number) => void;
  setChain: (chain: number) => void;
  setVoiceIndex: (voiceIndex: number) => void;
  setPattern: (pattern: Pattern) => void;

  // Sequence manipulation
  toggleStep: (voiceIndex: number, variation: number, step: number) => void;
  setVelocity: (
    voiceIndex: number,
    variation: number,
    step: number,
    velocity: number,
  ) => void;
  updateSequence: (
    voiceIndex: number,
    variation: number,
    triggers: boolean[],
    velocities: number[],
  ) => void;
  clearSequence: (voiceIndex: number, variation: number) => void;

  // Computed getter
  getCurrentSequence: () => boolean[];
}

export const useSequencerStore = create<SequencerState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        pattern: createEmptyPattern(),
        variation: 0,
        chain: 0,
        voiceIndex: 0,

        // Actions
        setVariation: (variation) => {
          set({ variation });
        },

        setChain: (chain) => {
          set({ chain });
        },

        setVoiceIndex: (voiceIndex) => {
          set({ voiceIndex });
        },

        setPattern: (pattern) => {
          set({ pattern });
        },

        toggleStep: (voiceIndex, variation, step) => {
          set((state) => {
            const currentValue =
              state.pattern[voiceIndex].variations[variation].triggers[step];
            state.pattern[voiceIndex].variations[variation].triggers[step] =
              !currentValue;
            // Set default velocity to 1 when enabling a step
            if (!currentValue) {
              state.pattern[voiceIndex].variations[variation].velocities[step] =
                1;
            }
          });
        },

        setVelocity: (voiceIndex, variation, step, velocity) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].velocities[step] =
              velocity;
          });
        },

        updateSequence: (voiceIndex, variation, triggers, velocities) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].triggers = triggers;
            state.pattern[voiceIndex].variations[variation].velocities =
              velocities;
          });
        },

        clearSequence: (voiceIndex, variation) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].triggers =
              Array(16).fill(false);
            state.pattern[voiceIndex].variations[variation].velocities =
              Array(16).fill(1);
          });
        },

        getCurrentSequence: () => {
          const { pattern, voiceIndex, variation } = get();
          return pattern[voiceIndex].variations[variation].triggers;
        },
      })),
      {
        name: "drumhaus-sequencer-storage",
        // Persist pattern and settings
        partialize: (state) => ({
          pattern: state.pattern,
          variation: state.variation,
          chain: state.chain,
          // Don't persist voiceIndex (UI state)
        }),
      },
    ),
    {
      name: "SequencerStore",
    },
  ),
);
