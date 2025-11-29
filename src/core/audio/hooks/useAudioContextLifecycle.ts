import { useEffect } from "react";

import { ensureAudioContextRunning } from "../engine/audioContextManager";

/**
 * Proactively keeps the audio context healthy across tab visibility/focus changes
 * and eagerly resumes on the next user gesture.
 */
export function useAudioContextLifecycleMonitor() {
  useEffect(() => {
    let lastGestureEnsure = 0;
    const ENSURE_THROTTLE_MS = 250;

    const ensureOnGesture = (event: Event) => {
      // Only run once per small window to avoid duplicate resumes from pointerdown/touchstart
      const now = performance.now();
      if (now - lastGestureEnsure < ENSURE_THROTTLE_MS) return;
      lastGestureEnsure = now;
      void ensureAudioContextRunning(event.type);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void ensureAudioContextRunning("visibilitychange");
      }
    };

    const handlePageShow = () => {
      void ensureAudioContextRunning("pageshow");
    };

    const handleFocus = () => {
      void ensureAudioContextRunning("focus");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);

    // Capture early in the event chain to be eligible as a "user gesture" for autoplay policies
    const gestureEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "touchstart",
      "keydown",
    ];
    gestureEvents.forEach((eventName) => {
      window.addEventListener(eventName, ensureOnGesture, {
        capture: true,
        passive: true,
      });
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      gestureEvents.forEach((eventName) => {
        window.removeEventListener(eventName, ensureOnGesture);
      });
    };
  }, []);
}
