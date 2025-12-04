import React from "react";
import { motion } from "framer-motion";

import { cn } from "@/shared/lib/utils";
import { Label, Tooltip } from "@/shared/ui";
import { useKnobControls } from "../hooks/useKnobControls";
import { createKnobKeyboardHandler } from "../lib/accessibility";
import {
  KNOB_OUTER_TICK_COUNT_DEFAULT,
  KNOB_VALUE_DEFAULT,
  KNOB_VALUE_MAX,
  KNOB_VALUE_MIN,
} from "../lib/constants";
import { KnobCoachmark } from "./KnobCoachmark";
import { KnobTicks } from "./KnobTicks";

export type KnobSize = "default" | "lg";

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
  /** Hide the rotating tick indicator at the top of the knob */
  showTickIndicator?: boolean;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  onValueChange,
  label,
  activeLabel,
  disabled = false,
  size = "default",
  outerTickCount = KNOB_OUTER_TICK_COUNT_DEFAULT,
  step: stepSize = KNOB_VALUE_DEFAULT,
  defaultValue = KNOB_VALUE_DEFAULT,
  showTickIndicator = true,
}) => {
  const containerClass = {
    default: "h-20",
    lg: "h-44",
  }[size];

  const {
    rotation,
    handlePointerDown,
    handleDoubleClick,
    isMoving,
    tooltipSide,
    tooltipContent,
    knobContainerRef,
    showCoachmark,
  } = useKnobControls({
    value,
    stepSize,
    onValueChange,
    defaultValue,
    disabled,
    label,
    activeLabel,
  });

  const handleKeyDown = createKnobKeyboardHandler({
    value,
    stepSize,
    onValueChange,
    onReset: () => onValueChange(defaultValue),
    disabled,
  });

  return (
    <div
      className={cn(
        "flex aspect-square flex-col items-center justify-center",
        containerClass,
      )}
    >
      {/* Knob Container */}
      <Tooltip
        content={tooltipContent}
        delayDuration={0}
        side={tooltipSide}
        open={isMoving}
      >
        <div
          ref={knobContainerRef}
          className="relative flex aspect-square h-4/5 touch-none items-center justify-center rounded-full select-none"
          style={{ touchAction: "none" }}
        >
          <KnobCoachmark
            visible={showCoachmark}
            message="Drag up/down to adjust"
            anchorRef={knobContainerRef}
          />
          {/* Hitbox (Rotates) */}
          <motion.div
            className={cn(
              "absolute z-1 aspect-square h-5/6 origin-center touch-none rounded-full select-none",
              "focus-ring cursor-grab aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed",
            )}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            role="slider"
            aria-label={label}
            aria-valuemin={KNOB_VALUE_MIN}
            aria-valuemax={KNOB_VALUE_MAX}
            aria-valuenow={value}
            style={{
              rotate: rotation,
            }}
            aria-disabled={disabled}
          >
            {showTickIndicator && (
              <svg
                className="absolute top-[2%] left-1/2 w-[4.17%] -translate-x-1/2"
                height="19%"
                viewBox="0 0 2 20"
                preserveAspectRatio="none"
              >
                <line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2="20"
                  className="stroke-foreground-muted"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </motion.div>

          {/* Knob Base (Fixed and motionless for shadow effect) */}
          <div
            className="border-shadow-30 flex aspect-square h-4/5 items-center justify-center rounded-full border shadow-(--shadow-neu-tall)"
            style={{
              background: "var(--knob-gradient)",
            }}
          >
            {/* Raised Knob Edge */}
            <div
              className="border-shadow-30 relative flex h-3/5 w-3/5 items-center justify-center rounded-full border shadow-(--shadow-neu-tall-raised)"
              style={{
                background: "var(--knob-gradient)",
              }}
            >
              {/* Raised Knob Inner Circle */}
              <div className="border-shadow-10 bg-surface-groove raised absolute top-1/2 left-1/2 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-(--knob-shadow-center)" />
            </div>
          </div>

          {/* Outer ticks */}
          {outerTickCount > 0 && <KnobTicks outerTickCount={outerTickCount} />}
        </div>
      </Tooltip>

      {/* Label */}
      <div className="flex items-center justify-center">
        <Label>{label}</Label>
      </div>
    </div>
  );
};
