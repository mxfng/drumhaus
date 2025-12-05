import { useEffect, useRef, useState } from "react";

const COACHMARK_VISIBLE_MS = 4000;

// Module-level cache to track which coachmarks have been seen
const seenCoachmarks = new Map<string, boolean>();

const readStoredSeen = (storageKey: string) => {
  try {
    return window.sessionStorage.getItem(storageKey) === "true";
  } catch {
    return false;
  }
};

const markSeen = (storageKey: string) => {
  seenCoachmarks.set(storageKey, true);
  try {
    window.sessionStorage.setItem(storageKey, "true");
  } catch {
    // ignore storage write issues
  }
};

interface UseCoachmarkOptions {
  /**
   * Unique storage key for this coachmark.
   * Uses sessionStorage to persist the "seen" state.
   */
  storageKey: string;
  duration?: number;
}

/**
 * One-time coachmark visibility controller.
 * Persists a session-scoped flag so we only show guidance once per user/session.
 *
 * @param options - Configuration options including the storage key
 * @returns Coachmark visibility state and control functions
 */
export function useCoachmark({
  storageKey,
  duration = COACHMARK_VISIBLE_MS,
}: UseCoachmarkOptions) {
  const [showCoachmark, setShowCoachmark] = useState(false);
  const hasShownRef = useRef(
    seenCoachmarks.get(storageKey) || readStoredSeen(storageKey),
  );
  const hideTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const triggerCoachmark = () => {
    if (
      hasShownRef.current ||
      seenCoachmarks.get(storageKey) ||
      readStoredSeen(storageKey)
    )
      return;

    hasShownRef.current = true;
    seenCoachmarks.set(storageKey, true);
    setShowCoachmark(true);
    markSeen(storageKey);

    hideTimeoutRef.current = window.setTimeout(() => {
      setShowCoachmark(false);
    }, duration);
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
