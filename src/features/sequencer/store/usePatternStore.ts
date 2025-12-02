import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { createEmptyPattern } from "@/features/sequencer/lib/helpers";
import { migratePatternUnsafe } from "@/features/sequencer/lib/migrations";
import { clampNudge } from "@/features/sequencer/lib/timing";
import { Pattern, TimingNudge } from "@/features/sequencer/types/pattern";
import { VariationCycle } from "../types/sequencer";

/**
 * Sequencer mode - represents what the user is currently editing.
 * Modes are mutually exclusive and determine sequencer grid behavior.
 */
export type SequencerMode =
  | { type: "voice"; voiceIndex: number } // Editing a specific voice/instrument pattern
  | { type: "accent" } // Editing accent pattern (variation-level)
  | { type: "copy" } // Copy mode (future)
  | { type: "paste" } // Paste mode (future)
  | { type: "clear" } // Clear mode (future)
  | { type: "random" } // Random mode (future)
  | { type: "variationChain" }; // Variation chain mode (future)

interface PatternState {
  // Pattern data - 8 voices, each with instrumentIndex and 2 variations
  pattern: Pattern;
  patternVersion: number;

  // Sequencer controls
  variation: number; // A = 0, B = 1
  variationCycle: VariationCycle; // A = 0, B = 1, AB = 2, AAAB = 3

  // Sequencer mode (not persisted - UI state only)
  mode: SequencerMode;

  // Playback context (which variation is actually being played by the engine)
  playbackVariation: number; // Mirrors the engine's active variation (A = 0, B = 1)

  // Actions
  setVariation: (variation: number) => void;
  setVariationCycle: (variationCycle: VariationCycle) => void;
  setPattern: (pattern: Pattern) => void;
  setPlaybackVariation: (variation: number) => void;

  // Mode actions
  setMode: (mode: SequencerMode) => void;
  setVoiceMode: (voiceIndex: number) => void;
  toggleAccentMode: () => void;

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

  // Accent manipulation
  toggleAccent: (variation: number, step: number) => void;

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
        mode: { type: "voice", voiceIndex: 0 },
        playbackVariation: 0,

        // Actions
        setVariation: (variation) => {
          set({ variation });
        },

        setVariationCycle: (variationCycle) => {
          set({ variationCycle });
        },

        setMode: (mode) => {
          set({ mode });
        },

        setVoiceMode: (voiceIndex) => {
          set({ mode: { type: "voice", voiceIndex } });
        },

        toggleAccentMode: () => {
          set((state) => {
            if (state.mode.type === "accent") {
              // Exit accent mode, return to last voice (default to 0)
              return { mode: { type: "voice", voiceIndex: 0 } };
            } else {
              // Enter accent mode
              return { mode: { type: "accent" } };
            }
          });
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
              state.pattern.voices[voiceIndex].variations[variation].triggers[
                step
              ];
            state.pattern.voices[voiceIndex].variations[variation].triggers[
              step
            ] = !currentValue;
            // Set default velocity to 1 when enabling a step
            if (!currentValue) {
              state.pattern.voices[voiceIndex].variations[variation].velocities[
                step
              ] = 1;
            }
            state.patternVersion += 1;
          });
        },

        setVelocity: (voiceIndex, variation, step, velocity) => {
          set((state) => {
            state.pattern.voices[voiceIndex].variations[variation].velocities[
              step
            ] = velocity;
            state.patternVersion += 1;
          });
        },

        updatePattern: (voiceIndex, variation, triggers, velocities) => {
          set((state) => {
            state.pattern.voices[voiceIndex].variations[variation].triggers =
              triggers;
            state.pattern.voices[voiceIndex].variations[variation].velocities =
              velocities;
            state.patternVersion += 1;
          });
        },

        clearPattern: (voiceIndex, variation) => {
          set((state) => {
            state.pattern.voices[voiceIndex].variations[variation].triggers =
              Array(STEP_COUNT).fill(false);
            state.pattern.voices[voiceIndex].variations[variation].velocities =
              Array(STEP_COUNT).fill(1);
            state.patternVersion += 1;
          });
        },

        toggleAccent: (variation, step) => {
          set((state) => {
            const currentValue =
              state.pattern.variationMetadata[variation].accent[step];
            state.pattern.variationMetadata[variation].accent[step] =
              !currentValue;
            state.patternVersion += 1;
          });
        },

        nudgeTimingLeft: () => {
          set((state) => {
            // Only works in voice mode
            if (state.mode.type !== "voice") return;

            const { voiceIndex } = state.mode;
            const { variation } = state;
            const currentNudge =
              state.pattern.voices[voiceIndex].variations[variation]
                .timingNudge;
            state.pattern.voices[voiceIndex].variations[variation].timingNudge =
              clampNudge(currentNudge - 1);
            state.patternVersion += 1;
          });
        },

        nudgeTimingRight: () => {
          set((state) => {
            // Only works in voice mode
            if (state.mode.type !== "voice") return;

            const { voiceIndex } = state.mode;
            const { variation } = state;
            const currentNudge =
              state.pattern.voices[voiceIndex].variations[variation]
                .timingNudge;
            state.pattern.voices[voiceIndex].variations[variation].timingNudge =
              clampNudge(currentNudge + 1);
            state.patternVersion += 1;
          });
        },

        setTimingNudge: (voiceIndex, variation, nudge) => {
          set((state) => {
            state.pattern.voices[voiceIndex].variations[variation].timingNudge =
              nudge;
            state.patternVersion += 1;
          });
        },
      })),

      {
        name: "drumhaus-sequencer-storage",
        version: 2,
        // Persist pattern and settings
        partialize: (state) => ({
          pattern: state.pattern,
          patternVersion: state.patternVersion,
          variation: state.variation,
          variationCycle: state.variationCycle,
        }),
        // Migration: ensure all pattern fields are up-to-date
        migrate: (persistedState: unknown) => {
          const state = persistedState as Partial<PatternState>;
          if (state?.pattern) {
            // Migrate pattern to latest format (handles all versions)
            // - Version 0->2: adds timingNudge + converts to { voices, variationMetadata }
            // - Version 1->2: converts Voice[] to { voices, variationMetadata }
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
