import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

import {
  KNOB_OUTER_TICK_COUNT_DEFAULT,
  KNOB_VALUE_DEFAULT,
  KNOB_VALUE_MAX,
  KNOB_VALUE_MIN,
} from "@/lib/knob/constants";
import { ParamMapping } from "@/lib/knob/types";
import { clamp, cn, quantize } from "@/lib/utils";
import { Label } from "../ui";

export type KnobSize = "default" | "lg";

const KNOB_ROTATION_RANGE_DEGREES: [number, number] = [-135, 135];

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

interface KnobProps {
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
 * Knob component that uses vertical drag motion to adjust the `value` property via `onValueChange`.
 *
 * For our audio engine, the value must be within the range of `[0, 100]`.
 *
 * Knobs are meant to be controlled via `ParamKnob` components, which provide a `mapping` that
 * converts the knob value to a domain value and back.
 */
const Knob: React.FC<KnobProps> = ({
  value,
  onValueChange,
  label,
  activeLabel,
  disabled = false,
  size = "default",
  outerTickCount = KNOB_OUTER_TICK_COUNT_DEFAULT,
  step: stepSize = KNOB_VALUE_DEFAULT,
  defaultValue = KNOB_VALUE_DEFAULT,
}) => {
  const containerClass = {
    default: "h-[90px]",
    lg: "h-[180px]",
  }[size];

  const quantizedValue = quantize(value, stepSize);

  const initMoveYRef = useRef(0);
  const initValueRef = useRef(quantizedValue);

  const [isMoving, setIsMoving] = useState(false);

  // -- Framer Motion ---

  const moveY = useMotionValue(quantizedValue);

  const rotation = useTransform(
    moveY,
    [KNOB_VALUE_MIN, KNOB_VALUE_MAX],
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
    initValueRef.current = quantize(value, stepSize);
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

      const newValue = clamp(
        initValueRef.current + deltaY,
        KNOB_VALUE_MIN,
        KNOB_VALUE_MAX,
      );

      const q = quantize(newValue, stepSize);

      moveY.set(q);
      onValueChange(q);
    },
    [isMoving, initMoveYRef, stepSize, onValueChange, moveY],
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
  }, [isMoving, disabled, stepSize, handleMouseMove, handleMoveEnd]);

  // Sync motion value when knob is updated externally (e.g. presets/kits)
  useEffect(() => {
    // Note: We use moveY.set() directly here instead of move() because this is a programmatic update, not an interactive drag operation
    if (isMoving) return;

    const quantizedValue = quantize(value, stepSize);

    moveY.set(quantizedValue);

    initMoveYRef.current = 0;
    initValueRef.current = quantizedValue;
  }, [isMoving, value, moveY, stepSize]);

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
          aria-valuemin={KNOB_VALUE_MIN}
          aria-valuemax={KNOB_VALUE_MAX}
          aria-valuenow={value}
          style={{
            rotate: rotation,
          }}
        >
          {/* Tick Mark */}
          <svg
            className="absolute top-[2%] left-1/2 -translate-x-1/2"
            width="calc(1/24*100%)"
            height="19%"
            viewBox="0 0 2 20"
            preserveAspectRatio="none"
          >
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="20"
              className="stroke-shadow-60"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
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

interface ParamKnobProps<TValue> {
  label: string;
  /** Mapping to convert between knob value (sometimes called "step") and domain value */
  mapping: ParamMapping<TValue>;
  /** Quantization size (e.g. 1, 5, 100/7) ... If you want 8 options then 100 / 7 */
  value: number;
  /** Callback function to update the knob value in state */
  onValueChange: (value: number) => void;
  /** Number of outer ticks to render - must be odd if halfway mark is desired */
  outerTickCount?: number;
  /** Size of the knob - `"default"` is 90px, `"lg"` is 180px */
  size?: KnobSize;
}

/**
 * Utility component to wrap a ParamMapping with a Knob component.
 */
function ParamKnob<TValue>({
  label,
  mapping,
  value: knobValue,
  onValueChange: onKnobValueChange,
  outerTickCount = KNOB_OUTER_TICK_COUNT_DEFAULT,
  size = "default",
}: ParamKnobProps<TValue>) {
  // Calculate quantization step for the knob
  // e.g., stepCount=48 → quantStep≈2.08 (knob snaps to 48 positions)
  const quantizationStep = 100 / mapping.knobValueCount;

  const domainValue = mapping.knobToDomain(knobValue);
  const activeLabelFmt = mapping.format(domainValue, knobValue);
  const activeLabel = `${activeLabelFmt.value} ${activeLabelFmt.append ? activeLabelFmt.append : ""}`;

  // Quantize to ensure stored value maps to clean parameter values
  const handleKnobValueChange = (newKnobValue: number) => {
    // Convert to domain value
    const paramValue = mapping.knobToDomain(newKnobValue);
    // Convert back to canonical knob value for this parameter
    // Pass newKnobValue as hint for non-bijective mappings (e.g., split filter)
    const canonicalKnobValue = mapping.domainToKnob(paramValue, newKnobValue);
    // Store the canonical value to ensure consistency
    onKnobValueChange(canonicalKnobValue);
  };

  return (
    <Knob
      value={knobValue}
      onValueChange={handleKnobValueChange}
      step={quantizationStep}
      label={label}
      activeLabel={activeLabel}
      defaultValue={mapping.defaultKnobValue}
      outerTickCount={outerTickCount}
      size={size}
    />
  );
}

export default ParamKnob;
