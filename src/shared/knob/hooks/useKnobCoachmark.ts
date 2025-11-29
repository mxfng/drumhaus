import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "knob-coachmark-shown";

const COACHMARK_VISIBLE_MS = 4000;

let coachmarkSeen = false;

const readStoredSeen = () => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const markSeen = () => {
  coachmarkSeen = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // ignore storage write issues
  }
};

/**
 * One-time coachmark visibility controller for the knob.
 * Persists a session-scoped flag so we only show guidance once per user/session.
 */
export function useKnobCoachmark() {
  const [showCoachmark, setShowCoachmark] = useState(false);
  const hasShownRef = useRef(coachmarkSeen || readStoredSeen());
  const hideTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const triggerCoachmark = () => {
    if (hasShownRef.current || coachmarkSeen || readStoredSeen()) return;

    hasShownRef.current = true;
    coachmarkSeen = true;
    setShowCoachmark(true);
    markSeen();

    hideTimeoutRef.current = window.setTimeout(() => {
      setShowCoachmark(false);
    }, COACHMARK_VISIBLE_MS);
  };

  const dismissCoachmark = () => {
    setShowCoachmark(false);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
  };

  return {
    showCoachmark,
    triggerCoachmark,
    dismissCoachmark,
  };
}
