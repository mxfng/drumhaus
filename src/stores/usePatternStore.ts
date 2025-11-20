import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { createEmptyPattern } from "@/lib/pattern/helpers";
import { Pattern } from "@/types/pattern";
import type { VariationCycle } from "@/types/preset";

interface PatternState {
  // Pattern data - 8 voices, each with instrumentIndex and 2 variations
  pattern: Pattern;

  // Sequencer controls
  variation: number; // A = 0, B = 1
  variationCycle: VariationCycle; // A = 0, B = 1, AB = 2, AAAB = 3
  voiceIndex: number; // Currently selected voice (0-7)

  // Playback context (which variation is actually being played by the engine)
  playbackVariation: number; // Mirrors the engine's active variation (A = 0, B = 1)

  // Actions
  setVariation: (variation: number) => void;
  setVariationCycle: (variationCycle: VariationCycle) => void;
  setVoiceIndex: (voiceIndex: number) => void;
  setPattern: (pattern: Pattern) => void;
  setPlaybackVariation: (variation: number) => void;

  // Pattern manipulation
  toggleStep: (voiceIndex: number, variation: number, step: number) => void;
  setVelocity: (
    voiceIndex: number,
    variation: number,
    step: number,
    velocity: number,
  ) => void;
  updatePattern: (
    voiceIndex: number,
    variation: number,
    triggers: boolean[],
    velocities: number[],
  ) => void;
  clearPattern: (voiceIndex: number, variation: number) => void;
}

export const usePatternStore = create<PatternState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        pattern: createEmptyPattern(),
        variation: 0,
        variationCycle: "A",
        voiceIndex: 0,
        playbackVariation: 0,

        // Actions
        setVariation: (variation) => {
          set({ variation });
        },

        setVariationCycle: (variationCycle) => {
          set({ variationCycle });
        },

        setVoiceIndex: (voiceIndex) => {
          set({ voiceIndex });
        },

        setPattern: (pattern) => {
          set({ pattern });
        },

        setPlaybackVariation: (variation) => {
          set({ playbackVariation: variation });
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

        updatePattern: (voiceIndex, variation, triggers, velocities) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].triggers = triggers;
            state.pattern[voiceIndex].variations[variation].velocities =
              velocities;
          });
        },

        clearPattern: (voiceIndex, variation) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].triggers =
              Array(16).fill(false);
            state.pattern[voiceIndex].variations[variation].velocities =
              Array(16).fill(1);
          });
        },
      })),

      {
        name: "drumhaus-sequencer-storage",
        // Persist pattern and settings
        partialize: (state) => ({
          pattern: state.pattern,
          variation: state.variation,
          variationCycle: state.variationCycle,
        }),
      },
    ),
    {
      name: "SequencerStore",
    },
  ),
);
