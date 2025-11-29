import { useEffect, useRef } from "react";
import { getContext } from "tone/build/esm/index";

import { ensureAudioContextRunning } from "../engine/audioContextManager";

/**
 * Centralized audio context guard:
 * - eagerly resumes on visibility/pageshow/focus/user gestures (throttled)
 * - detects stalled clocks and reloads if recovery fails
 */
export function useAudioContextGuards() {
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

    const clearScheduled = () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };

    const scheduleChecks = (reason: string) => {
      clearScheduled();
      const baseline = getContext().currentTime;

      CHECK_DELAY_MS.forEach((delay, index) => {
        const id = window.setTimeout(async () => {
          const currentTime = getContext().currentTime;
          const delta = currentTime - baseline;
          const stalled = delta < CTX_DELTA_THRESHOLD;

          if (!stalled) {
            recoveryAttemptsRef.current = 0;
            return;
          }

          // First check: try to resume
          if (index === 0) {
            recoveryAttemptsRef.current += 1;
            await ensureAudioContextRunning(`guards:${reason}`);
            return;
          }

          // Second check and still stalled: reload as last resort
          recoveryAttemptsRef.current += 1;
          if (
            recoveryAttemptsRef.current >= MAX_RECOVERY_ATTEMPTS &&
            hasStartedOnce &&
            !reloadTriggeredRef.current
          ) {
            reloadTriggeredRef.current = true;
            window.location.reload();
          }
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
      void ensureAudioContextRunning(reason).then((running) => {
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
}
