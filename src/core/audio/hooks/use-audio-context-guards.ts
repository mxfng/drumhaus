import { useEffect, useRef } from "react";

import { getAudioEngine } from "@/core/audio/engine";
import { useToast } from "@/shared/ui";
import { ensureAudioContextIsRunning } from "../engine/context/manager";

/**
 * The guards observe the audio clock through the engine's read-only
 * diagnostics snapshot instead of reaching into Tone directly.
 */
function getContextTime(): number {
  return getAudioEngine().getDiagnostics().contextTime;
}

/**
 * Centralized audio context guard:
 * - eagerly resumes on visibility/pageshow/focus/user gestures (throttled)
 * - detects stalled clocks, rebuilds the audio graph in place, and only
 *   reloads the page if the in-place rebuild fails to revive the clock
 * - notifies user when a reload was triggered due to recovery failure
 */
function useAudioContextGuards() {
  const { toast } = useToast();
  const ensureThrottleRef = useRef<number>(0);
  const recoveryAttemptsRef = useRef(0);
  const reloadTriggeredRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    let hasStartedOnce = false;
    const ENSURE_THROTTLE_MS = 250;
    const CHECK_DELAY_MS = [300, 900]; // check after initial delay, then again if still stalled
    const CTX_DELTA_THRESHOLD = 0.005; // seconds
    const MAX_RECOVERY_ATTEMPTS = 2;
    const REBUILD_RECHECK_DELAY_MS = 300; // re-measure the clock after an in-place rebuild
    const REBUILD_TIMEOUT_MS = 8000; // generous for sample reloads, but finite

    const clearScheduled = () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };

    const scheduleChecks = (reason: string) => {
      clearScheduled();
      const baseline = getContextTime();

      CHECK_DELAY_MS.forEach((delay, index) => {
        const id = window.setTimeout(async () => {
          const currentTime = getContextTime();
          const delta = currentTime - baseline;
          const stalled = delta < CTX_DELTA_THRESHOLD;

          if (!stalled) {
            recoveryAttemptsRef.current = 0;
            return;
          }

          // First check: try to resume
          if (index === 0) {
            recoveryAttemptsRef.current += 1;
            await ensureAudioContextIsRunning(`guards:${reason}`);
            return;
          }

          // Second check and still stalled: rebuild the audio graph in
          // place from the engine's retained state, re-measure the clock,
          // and only reload the page as a last resort.
          recoveryAttemptsRef.current += 1;
          if (
            recoveryAttemptsRef.current < MAX_RECOVERY_ATTEMPTS ||
            !hasStartedOnce ||
            reloadTriggeredRef.current
          ) {
            return;
          }

          try {
            // Bound the rebuild attempt: a rebuild that hangs (e.g. on a
            // sample fetch that never settles) must not block the
            // re-measure/reload fallback below forever.
            const timedOut = await Promise.race([
              getAudioEngine()
                .rebuild()
                .then(() => false),
              new Promise<boolean>((resolve) =>
                window.setTimeout(() => resolve(true), REBUILD_TIMEOUT_MS),
              ),
            ]);
            if (timedOut) {
              console.warn(
                "[audio-guards] In-place rebuild timed out; falling back to re-measure",
              );
            }
          } catch (error) {
            console.warn("[audio-guards] In-place rebuild failed:", error);
          }
          await ensureAudioContextIsRunning(`guards:${reason}:rebuild`);

          const rebuildBaseline = getContextTime();
          await new Promise((resolve) =>
            window.setTimeout(resolve, REBUILD_RECHECK_DELAY_MS),
          );
          const rebuildDelta = getContextTime() - rebuildBaseline;

          if (rebuildDelta >= CTX_DELTA_THRESHOLD) {
            // The rebuild revived the clock - recovered without a reload.
            recoveryAttemptsRef.current = 0;
            return;
          }

          if (document.visibilityState !== "visible") {
            // Hidden tabs legitimately stall the clock; never reload from
            // the background. The next visibility change re-checks.
            return;
          }

          // Still stalled: reload as last resort
          reloadTriggeredRef.current = true;
          // Add URL parameter to notify user after reload
          const url = new URL(window.location.href);
          url.searchParams.set("audio_recovered", "1");
          window.location.href = url.toString();
        }, delay);

        timeoutsRef.current.push(id);
      });
    };

    const ensureWithThrottle = (reason: string) => {
      const now = performance.now();
      if (now - ensureThrottleRef.current < ENSURE_THROTTLE_MS) {
        return;
      }
      ensureThrottleRef.current = now;
      void ensureAudioContextIsRunning(reason).then((running) => {
        if (running) {
          hasStartedOnce = true;
          recoveryAttemptsRef.current = 0;
        }
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        ensureWithThrottle("visibilitychange");
        scheduleChecks("visibilitychange");
      } else {
        clearScheduled();
      }
    };

    const handlePageShow = () => {
      ensureWithThrottle("pageshow");
      scheduleChecks("pageshow");
    };

    const handleFocus = () => {
      ensureWithThrottle("focus");
      scheduleChecks("focus");
    };

    const handleGesture = (event: Event) => {
      ensureWithThrottle(event.type);
      scheduleChecks(event.type);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleFocus);

    const gestureEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "touchstart",
      "keydown",
    ];
    gestureEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleGesture, {
        capture: true,
      });
    });

    return () => {
      clearScheduled();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleFocus);
      gestureEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleGesture, {
          capture: true,
        });
      });
    };
  }, []);

  // Notify user if page was reloaded due to audio context recovery failure
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("audio_recovered")) {
      toast({
        title: "Audio Engine Restarted",
        description:
          "The audio engine encountered an issue and was automatically reloaded.",
        status: "info",
        duration: 6000,
      });

      // Clean up the URL parameter without reloading
      params.delete("audio_recovered");
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [toast]);
}

export { useAudioContextGuards };
