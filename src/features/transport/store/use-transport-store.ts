import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { getAudioEngine } from "@/core/audio/engine";
import { isLocalStartSuppressed } from "./local-start-control";

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
  /** Canonical Tone.Transport swing fraction (0..TRANSPORT_SWING_MAX). */
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

        // While an external owner controls playback start (the Jam session
        // adapter, when linked), togglePlay leaves starting the engine to it:
        // the store flip above just reached it (synchronous subscription),
        // and it starts playback aligned to the shared grid's downbeat. An
        // immediate start here would sound ahead of that downbeat and then
        // be restarted onto it - the double-fire stutter of issue #425.
        // The UI is already optimistic via the flip; engine playback-state
        // events reconcile it if the aligned start cannot run.
        if (isLocalStartSuppressed()) {
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
        getAudioEngine().setSwing(swing);
      },
    })),
    {
      name: "TransportStore",
    },
  ),
);

export { useTransportStore };
