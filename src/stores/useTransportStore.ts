import * as Tone from "tone/build/esm/index";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { InstrumentRuntime } from "@/types/types";

interface TransportState {
  // Playback state
  isPlaying: boolean;
  stepIndex: number;
  bpm: number;
  swing: number;

  // Actions
  togglePlay: (
    instrumentRuntimes: InstrumentRuntime[],
    onStop?: () => void,
  ) => Promise<void>;
  setStepIndex: (stepIndex: number) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
}

export const useTransportStore = create<TransportState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        isPlaying: false,
        stepIndex: 0,
        bpm: 120,
        swing: 50,
        toneSequence: null,

        // Actions
        togglePlay: async (instrumentRuntimes, onStop) => {
          // Start Tone.js context if needed
          if (Tone.context.state !== "running") {
            await Tone.start();
          }

          set((state) => {
            const newIsPlaying = !state.isPlaying;

            if (newIsPlaying) {
              Tone.Transport.start();
            } else {
              Tone.Transport.stop();
              state.stepIndex = 0;

              // Release all samples
              instrumentRuntimes.forEach((runtime: InstrumentRuntime) => {
                runtime.samplerNode.triggerRelease("C2", Tone.now());
              });

              // Call optional stop callback
              if (onStop) onStop();
            }

            state.isPlaying = newIsPlaying;
          });
        },

        setStepIndex: (stepIndex) => {
          set({ stepIndex });
        },

        setBpm: (bpm) => {
          set({ bpm });
          Tone.Transport.bpm.value = bpm;
        },

        setSwing: (swing) => {
          set({ swing });

          // Transform swing value from 0-100 to 0-0.5
          const newSwing = (swing / 100) * 0.5;
          Tone.Transport.swingSubdivision = "16n";
          Tone.Transport.swing = newSwing;
        },
      })),
      {
        name: "drumhaus-transport-storage",
        // Only persist user-facing state, not Tone.js refs
        partialize: (state) => ({
          bpm: state.bpm,
          swing: state.swing,
          // Don't persist isPlaying or stepIndex
        }),
      },
    ),
    {
      name: "TransportStore",
    },
  ),
);
