import { useCallback, useRef } from "react";

import { useCoachmark } from "@/shared/hooks/useCoachmark";

const HORIZONTAL_RATIO_THRESHOLD = 1.5;
const HORIZONTAL_MIN_DELTA = 10;
const VERTICAL_MIN_DELTA = 8;
const TAP_DISTANCE_THRESHOLD = 6;

const KNOB_COACHMARK_STORAGE_KEY = "coachmark-shown-knob-guidance";

interface Point {
  x: number;
  y: number;
}

/**
 * Lightweight heuristics to detect confusing knob interactions and trigger
 * the one-time coachmark. Keeps horizontal-drag/tap detection isolated from
 * the main knob interaction logic.
 */
export function useKnobGuidance() {
  const { showCoachmark, triggerCoachmark, dismissCoachmark } = useCoachmark({
    storageKey: KNOB_COACHMARK_STORAGE_KEY,
  });

  const startRef = useRef<Point | null>(null);
  const hasVerticalDragRef = useRef(false);

  const handleStart = useCallback((point: Point) => {
    startRef.current = point;
    hasVerticalDragRef.current = false;
  }, []);

  const handleMove = useCallback(
    (point: Point) => {
      if (!startRef.current) return;

      const deltaX = startRef.current.x - point.x;
      const deltaY = startRef.current.y - point.y;

      if (
        !hasVerticalDragRef.current &&
        Math.abs(deltaY) > VERTICAL_MIN_DELTA
      ) {
        hasVerticalDragRef.current = true;
        dismissCoachmark();
      }

      if (
        !hasVerticalDragRef.current &&
        Math.abs(deltaX) > Math.abs(deltaY) * HORIZONTAL_RATIO_THRESHOLD &&
        Math.abs(deltaX) > HORIZONTAL_MIN_DELTA
      ) {
        triggerCoachmark();
      }
    },
    [dismissCoachmark, triggerCoachmark],
  );

  const handleEnd = useCallback(
    (point: Point) => {
      if (!startRef.current || hasVerticalDragRef.current) return;

      const distance = Math.hypot(
        startRef.current.x - point.x,
        startRef.current.y - point.y,
      );
      if (distance < TAP_DISTANCE_THRESHOLD) {
        triggerCoachmark();
      }
    },
    [triggerCoachmark],
  );

  return {
    showCoachmark,
    handleStart,
    handleMove,
    handleEnd,
    dismissCoachmark,
  };
}
