import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  releaseAllRuntimes,
  setTransportBpm,
  setTransportSwing,
  startAudioContext,
  startTransport,
  stopTransport,
} from "@/lib/audio/engine";
import type { InstrumentRuntime } from "@/types/instrument";

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

        // Actions
        togglePlay: async (instrumentRuntimes, onStop) => {
          // Start Tone.js context if needed
          await startAudioContext();

          set((state) => {
            const newIsPlaying = !state.isPlaying;

            if (newIsPlaying) {
              startTransport();
            } else {
              // Stop transport and reset step index
              stopTransport(undefined, () => {
                state.stepIndex = 0;

                // Release all samples
                releaseAllRuntimes(instrumentRuntimes);

                // Call optional stop callback
                if (onStop) onStop();
              });
            }

            state.isPlaying = newIsPlaying;
          });
        },

        setStepIndex: (stepIndex) => {
          set({ stepIndex });
        },

        setBpm: (bpm) => {
          set({ bpm });
          setTransportBpm(bpm);
        },

        setSwing: (swing) => {
          set({ swing });
          setTransportSwing(swing);
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
