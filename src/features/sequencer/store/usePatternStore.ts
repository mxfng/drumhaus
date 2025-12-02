import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { createEmptyPattern } from "@/features/sequencer/lib/helpers";
import { migratePatternUnsafe } from "@/features/sequencer/lib/migrations";
import { clampNudge } from "@/features/sequencer/lib/timing";
import { Pattern, TimingNudge } from "@/features/sequencer/types/pattern";
import { VariationCycle } from "../types/sequencer";

interface PatternState {
  // Pattern data - 8 voices, each with instrumentIndex and 2 variations
  pattern: Pattern;
  patternVersion: number;

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

  // Timing nudge
  nudgeTimingLeft: () => void;
  nudgeTimingRight: () => void;
  setTimingNudge: (
    voiceIndex: number,
    variation: number,
    nudge: TimingNudge,
  ) => void;
}

export const usePatternStore = create<PatternState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        pattern: createEmptyPattern(),
        patternVersion: 0,
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
          set((state) => {
            state.pattern = pattern;
            state.patternVersion += 1;
          });
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
            state.patternVersion += 1;
          });
        },

        setVelocity: (voiceIndex, variation, step, velocity) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].velocities[step] =
              velocity;
            state.patternVersion += 1;
          });
        },

        updatePattern: (voiceIndex, variation, triggers, velocities) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].triggers = triggers;
            state.pattern[voiceIndex].variations[variation].velocities =
              velocities;
            state.patternVersion += 1;
          });
        },

        clearPattern: (voiceIndex, variation) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].triggers =
              Array(STEP_COUNT).fill(false);
            state.pattern[voiceIndex].variations[variation].velocities =
              Array(STEP_COUNT).fill(1);
            state.patternVersion += 1;
          });
        },

        nudgeTimingLeft: () => {
          set((state) => {
            const { voiceIndex, variation } = state;
            const currentNudge =
              state.pattern[voiceIndex].variations[variation].timingNudge;
            state.pattern[voiceIndex].variations[variation].timingNudge =
              clampNudge(currentNudge - 1);
            state.patternVersion += 1;
          });
        },

        nudgeTimingRight: () => {
          set((state) => {
            const { voiceIndex, variation } = state;
            const currentNudge =
              state.pattern[voiceIndex].variations[variation].timingNudge;
            state.pattern[voiceIndex].variations[variation].timingNudge =
              clampNudge(currentNudge + 1);
            state.patternVersion += 1;
          });
        },

        setTimingNudge: (voiceIndex, variation, nudge) => {
          set((state) => {
            state.pattern[voiceIndex].variations[variation].timingNudge = nudge;
            state.patternVersion += 1;
          });
        },
      })),

      {
        name: "drumhaus-sequencer-storage",
        version: 1,
        // Persist pattern and settings
        partialize: (state) => ({
          pattern: state.pattern,
          patternVersion: state.patternVersion,
          variation: state.variation,
          variationCycle: state.variationCycle,
        }),
        // Migration: ensure all pattern fields are up-to-date
        migrate: (persistedState: unknown, version: number) => {
          const state = persistedState as Partial<PatternState>;
          if (version === 0 && state?.pattern) {
            // Migrate from version 0 to version 1: add timingNudge to all step sequences
            try {
              state.pattern = migratePatternUnsafe(state.pattern);
            } catch (error) {
              console.error("Failed to migrate pattern:", error);
              // Fall back to empty pattern if migration fails
              state.pattern = createEmptyPattern();
            }
          }
          return state as PatternState;
        },
      },
    ),
    {
      name: "SequencerStore",
    },
  ),
);
