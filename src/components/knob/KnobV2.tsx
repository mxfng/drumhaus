import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

import {
  KNOB_OUTER_TICK_COUNT_DEFAULT,
  KNOB_STEP_DEFAULT,
  KNOB_STEP_MAX,
  KNOB_STEP_MIN,
} from "@/lib/knob/constants";
import { cn } from "@/lib/utils";
import { Label } from "../ui";

export type KnobSize = "default" | "lg";

const KNOB_ROTATION_RANGE_DEGREES: [number, number] = [-135, 135];

/**
 * Quantize a value to a step size. This is intended to stay in the UI space.
 */
const getQuantizedValue = (value: number, step: number): number => {
  const normalizedStep = step > 0 ? step : 1;
  return Math.round(value / normalizedStep) * normalizedStep;
};

/**
 * Calculate the rotation of a knob tick for display purposes.
 */
const getKnobTickRotation = (
  tickIndex: number,
  tickCount: number,
  range: [number, number],
) => {
  const rangeSize = range[1] - range[0];
  return (tickIndex / (tickCount - 1)) * rangeSize + range[0];
};

export interface KnobProps {
  /** Current knob position 0..100 */
  value: number;
  onValueChange: (newState: number) => void;

  /** Label to display below the knob */
  label: string;
  /** Shown while moving */
  activeLabel?: string;
  disabled?: boolean;
  /** Size of the knob - `"default"` is 90px, `"lg"` is 180px */
  size?: KnobSize;
  /** Number of outer ticks to render - must be odd if halfway mark is desired */
  outerTickCount?: number;
  /** Quantization size (e.g. 1, 5, 100/7) ... If you want 8 options then 100 / 7 */
  step?: number; // if you want 8 options for a knob, step = 100 / 7
  /** Default value for the knob */
  defaultValue?: number;
}

/**
 * TODO: Rewrite this guide with the new mapping system.
 *
 * OLD:
 * Knob component that uses vertical drag motion to adjust a `value` property via `onValueChange`.
 *
 * They have an default `range` of `[0, 100]` and can be quantized to an incrementing step size with `step`.
 *
 * They can transform their default range to a custom range using a given `scale`, such as `"linear"`, `"exp"`, or `"split-filter"`.
 *
 * They can provide user feedback for their current value in a human-readable format
 * using `range`, `units`, and an optional `formatDisplayFn`.
 */
export const Knob: React.FC<KnobProps> = ({
  value,
  onValueChange,
  label,
  activeLabel,
  disabled = false,
  size = "default",
  outerTickCount = KNOB_OUTER_TICK_COUNT_DEFAULT,
  step = KNOB_STEP_DEFAULT,
  defaultValue = KNOB_STEP_DEFAULT,
}) => {
  const containerClass = {
    default: "h-[90px]",
    lg: "h-[180px]",
  }[size];

  const quantizedValue = getQuantizedValue(value, step);

  const initMoveYRef = useRef(0);
  const initValueRef = useRef(quantizedValue);

  const [isMoving, setIsMoving] = useState(false);

  // -- Framer Motion ---

  const moveY = useMotionValue(quantizedValue);

  const rotation = useTransform(
    moveY,
    [KNOB_STEP_MIN, KNOB_STEP_MAX],
    KNOB_ROTATION_RANGE_DEGREES,
  );

  /**
   * Handle mouse down and touch start events to start the knob movement
   */
  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (disabled) return;

    setIsMoving(true);
    // Explicitly check for `touches` for mobile interactions
    initMoveYRef.current = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
    initValueRef.current = getQuantizedValue(value, step);
  };

  /**
   * Handles drag events for mouse and touch to change the knob value
   */
  const handleMouseMove = useCallback(
    (ev: MouseEvent | TouchEvent) => {
      if (!isMoving) return;

      ev.preventDefault();

      const clientY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      const deltaY = initMoveYRef.current - clientY;

      const newValue = Math.min(
        KNOB_STEP_MAX,
        Math.max(KNOB_STEP_MIN, initValueRef.current + deltaY),
      );

      const q = getQuantizedValue(newValue, step);

      moveY.set(q);
      onValueChange(q);
    },
    [isMoving, initMoveYRef, step, onValueChange, moveY],
  );

  /**
   * Disables moving state on mouse up and touch end events
   */
  const handleMoveEnd = useCallback(() => {
    setIsMoving(false);
  }, [setIsMoving]);

  /**
   * Reset knob to default value on double click
   */
  const handleDoubleClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    ev.preventDefault();
    onValueChange(defaultValue);
  };

  const getDisplayLabel = useCallback(
    () => (isMoving && activeLabel ? activeLabel : label),
    [isMoving, label, activeLabel],
  );
  /*
   * Handles knob updates for mouse and touch movement. Had to use a useEffect because
   *
   * Do not attempt to move these to onMouseMove, onMouseUp, etc.
   *
   * The event listeners need to be added and removed dynamically to achieve the desired behavior.
   */
  useEffect(() => {
    if (disabled) return;

    const opts: AddEventListenerOptions = {
      passive: false,
    };

    if (isMoving) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("touchmove", handleMouseMove, opts);
      window.addEventListener("mouseup", handleMoveEnd);
      window.addEventListener("touchend", handleMoveEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleMouseMove, opts);
      window.removeEventListener("mouseup", handleMoveEnd);
      window.removeEventListener("touchend", handleMoveEnd);
    };
  }, [isMoving, disabled, step, handleMouseMove, handleMoveEnd]);

  // Sync motion value when knob is updated externally (e.g. presets/kits)
  useEffect(() => {
    // Note: We use moveY.set() directly here instead of move() because this is a programmatic update, not an interactive drag operation
    if (isMoving) return;

    const quantizedValue = getQuantizedValue(value, step);

    moveY.set(quantizedValue);

    initMoveYRef.current = 0;
    initValueRef.current = quantizedValue;
  }, [isMoving, value, moveY, step]);

  // Cleanup function to reset the moving state when the component unmounts
  useEffect(() => {
    return () => {
      setIsMoving(false);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex aspect-square flex-col items-center justify-center",
        containerClass,
      )}
    >
      {/* Knob Container */}
      <div className="relative flex aspect-square h-4/5 items-center justify-center rounded-full">
        {/* Hitbox (Rotates) */}
        <motion.div
          className={cn(
            "absolute z-1 aspect-square h-5/6 origin-center rounded-full",
            disabled ? "pointer-events-none cursor-not-allowed" : "cursor-grab",
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          aria-label={label}
          aria-valuemin={KNOB_STEP_MIN}
          aria-valuemax={KNOB_STEP_MAX}
          aria-valuenow={value}
          style={{
            rotate: rotation,
          }}
        >
          {/* Tick Mark */}
          <div className="bg-shadow-60 absolute left-1/2 h-1/5 w-[calc(1/40*100%)] -translate-x-1/2" />
        </motion.div>

        {/* Knob Base (Fixed and motionless for shadow effect) */}
        <div
          className="flex aspect-square h-4/5 items-center justify-center rounded-full shadow-(--shadow-neu-tall)"
          style={{ background: "var(--knob-gradient)" }}
        >
          {/* Raised Knob Edge */}
          <div
            className="border-shadow-60 relative flex h-3/5 w-3/5 items-center justify-center rounded-full shadow-(--shadow-neu-tall-raised)"
            style={{ background: "var(--knob-gradient)" }}
          >
            {/* Raised Knob Inner Circle */}
            <div className="bg-surface-groove raised absolute top-1/2 left-1/2 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-(--knob-shadow-center)" />
          </div>
        </div>

        {/* Outer ticks */}
        {Array.from({ length: outerTickCount }).map((_, idx) => (
          <motion.div
            key={idx}
            className="absolute inset-0 origin-center"
            style={{
              rotate: getKnobTickRotation(
                idx,
                outerTickCount,
                KNOB_ROTATION_RANGE_DEGREES,
              ),
            }}
          >
            <div className="bg-shadow-60 absolute top-[2%] left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full" />
          </motion.div>
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center justify-center">
        <Label>{getDisplayLabel()}</Label>
      </div>
    </div>
  );
};
