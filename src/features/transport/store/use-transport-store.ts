import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { transportSwingKnobToDomain } from "@/core/audio/bridge/knob-to-domain";
import { getAudioEngine } from "@/core/audio/engine";

// No persist middleware: bpm/swing persist inside the session document
// (features/preset/session), restored by bootstrapSession() before React
// mounts. The retired v0 -> v1 swing migrate (#269) now lives in the
// legacy session adopter (legacy-adopter.ts), and the old
// onRehydrateStorage engine push is unnecessary: bootstrap applies through
// setBpm/setSwing, which already issue the engine commands.

interface TransportState {
  // Playback state
  isPlaying: boolean;
  bpm: number;
  swing: number;

  // Actions
  togglePlay: () => Promise<void>;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
}

const useTransportStore = create<TransportState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      isPlaying: false,
      bpm: 100, // Default value, overwritten by preset load
      swing: 0, // Default value, overwritten by preset load

      // Actions
      togglePlay: async () => {
        const engine = getAudioEngine();

        // Decide and flip synchronously BEFORE any await so rapid toggles
        // (double-tap) each observe the previous tap's intent instead of
        // a stale pre-await value. The engine's onPlaybackStateChange
        // event (mirrored by the bridge) reconciles any residual drift.
        const shouldPlay = !get().isPlaying;
        set({ isPlaying: shouldPlay });

        if (!shouldPlay) {
          engine.stop();
          return;
        }

        try {
          // Tempo and swing are already retained engine-side (pushed by
          // setBpm/setSwing and on rehydrate); engine.play() re-applies
          // them, so no backup push is needed here.
          await engine.play();
        } catch (error) {
          console.error("Failed to start playback:", error);
          set({ isPlaying: false });
        }
      },

      setBpm: (bpm) => {
        set({ bpm });
        getAudioEngine().setTempo(bpm);
      },

      setSwing: (swing) => {
        set({ swing });
        getAudioEngine().setSwing(transportSwingKnobToDomain(swing));
      },
    })),
    {
      name: "TransportStore",
    },
  ),
);

export { useTransportStore };
