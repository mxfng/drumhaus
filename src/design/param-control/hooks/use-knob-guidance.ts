import { useCallback, useRef } from "react";

import { useCoachmark } from "./use-coachmark";

const HORIZONTAL_RATIO_THRESHOLD = 1.5;
const HORIZONTAL_MIN_DELTA = 10;
const VERTICAL_MIN_DELTA = 8;

const KNOB_COACHMARK_STORAGE_KEY = "coachmark-shown-knob-guidance";

interface Point {
  x: number;
  y: number;
}

/**
 * Lightweight heuristics to detect a confusing knob interaction and trigger the
 * one-time coachmark. A user who drags horizontally (expecting the value to
 * change) is nudged toward the correct vertical gesture; a vertical drag
 * dismisses the hint. Kept isolated from the descriptor-driven interaction core
 * in `useParamControl` so the knob stays a thin presentation skin.
 *
 * Ported from the original hand-built knob. The tap heuristic was dropped: the
 * descriptor-driven knob body is drag-only, so a press without drag changes
 * nothing and is no longer an ambiguous gesture worth coaching (type-in moved
 * to a double-click on the caption label).
 */
function useKnobGuidance() {
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

  return {
    showCoachmark,
    handleStart,
    handleMove,
    dismissCoachmark,
  };
}

export { useKnobGuidance };
