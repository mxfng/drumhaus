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
import { init } from "@/lib/preset";
import type { InstrumentRuntime } from "@/types/instrument";

interface TransportState {
  // Playback state
  isPlaying: boolean;
  bpm: number;
  swing: number;

  // Actions
  togglePlay: (
    instrumentRuntimes: InstrumentRuntime[],
    onStop?: () => void,
  ) => Promise<void>;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
}

export const useTransportStore = create<TransportState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        isPlaying: false,
        bpm: init().transport.bpm,
        swing: init().transport.swing,

        // Actions
        togglePlay: async (instrumentRuntimes, onStop) => {
          // Start Tone.js context if needed
          await startAudioContext();

          set((state) => {
            const newIsPlaying = !state.isPlaying;

            if (newIsPlaying) {
              // We set bpm and swing here as a backup.
              // They should be set in loadPreset() or on rehydrate.
              setTransportBpm(state.bpm);
              setTransportSwing(state.swing);

              startTransport();
            } else {
              stopTransport(undefined, () => {
                // Release all samples
                releaseAllRuntimes(instrumentRuntimes);

                // Call optional stop callback
                if (onStop) onStop();
              });
            }

            state.isPlaying = newIsPlaying;
          });
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
        }),
        // Apply persisted transport settings when store rehydrates
        onRehydrateStorage: () => (state) => {
          if (state) {
            setTransportBpm(state.bpm);
            setTransportSwing(state.swing);
          }
        },
      },
    ),
    {
      name: "TransportStore",
    },
  ),
);
