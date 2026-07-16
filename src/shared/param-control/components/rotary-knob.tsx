import { useCallback, useRef, useState } from "react";

import { Coachmark } from "@/shared/components/coachmark";
import { cn } from "@/shared/lib/utils";
import { Label, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui";
import { useKnobGuidance } from "../hooks/use-knob-guidance";
import { useParamControl } from "../hooks/use-param-control";
import { KNOB_DRAG_SENSITIVITY } from "../lib/descriptor";
import type { ParamDescriptor, RotaryKnobFutureSeams } from "../types";
import { KnobTicks } from "./knob-ticks";

/** Diameter presets, matching the original hardware knob: 90px / 180px cells. */
type KnobSize = "default" | "lg";

/** Sweep of the dial, centred on 12 o'clock: 0 -> -135deg, 1 -> +135deg. */
const START_ANGLE_DEG = -135;
const ROTATION_RANGE_DEG = 270;

/** Movement (px) before a press counts as a drag rather than a tap-to-type. */
const DRAG_THRESHOLD_PX = 3;

type RotaryKnobProps<T> = {
  descriptor: ParamDescriptor<T>;
  /** Value in CANONICAL units. */
  value: T;
  /** Emits the next value in CANONICAL units. */
  onChange: (value: T) => void;
  onGestureStart?: () => void;
  onGestureEnd?: () => void;
  disabled?: boolean;
  label: string;
  /** Opt-in tab order (default true). */
  tabbable?: boolean;
  id?: string;
  /** Diameter preset - `"default"` is 90px, `"lg"` is 180px. */
  size?: KnobSize;
  /** Number of fixed outer tick marks (odd for a centred mark; 0 to hide). */
  outerTickCount?: number;
  /** Hide the rotating value indicator at 12 o'clock. */
  showTickIndicator?: boolean;
  /** Hide the caption label under the dial. */
  hideLabel?: boolean;
  /** Per-instance override for the normalized drag delta per pixel. */
  dragSensitivity?: number;
  className?: string;
} & RotaryKnobFutureSeams;

/**
 * The rotary presentation of the descriptor-driven control: the hand-built
 * neumorphic knob body driven entirely by `useParamControl`. The body owns look
 * only (sculpted base, rotating indicator, outer ticks); all behaviour and the
 * canonical-only contract live in the hook.
 *
 * The resting knob shows no number - the value surfaces in a wrap-around
 * tooltip only while dragging (viewport-aware side), exactly as the original.
 * A tap (press without drag) opens the type-in editor over the dial; a
 * horizontal drag triggers the first-use guidance coachmark.
 *
 * FUTURE seams (modulation-range arc, circular drag mode, context menu) are
 * declared on the props but intentionally not implemented (docs/knob-primitive.md).
 */
function RotaryKnob<T>({
  descriptor,
  value,
  onChange,
  onGestureStart,
  onGestureEnd,
  disabled = false,
  label,
  tabbable = true,
  id,
  size = "default",
  outerTickCount = 2,
  showTickIndicator = true,
  hideLabel = false,
  dragSensitivity = KNOB_DRAG_SENSITIVITY,
  className,
  // Declared future seams; not wired yet.
  modulationRange: _modulationRange,
  dragMode: _dragMode,
  onContextMenuRequest: _onContextMenuRequest,
}: RotaryKnobProps<T>) {
  const control = useParamControl({
    descriptor,
    value,
    onChange,
    onGestureStart,
    onGestureEnd,
    disabled,
    label,
    tabbable,
    id,
    dragThreshold: DRAG_THRESHOLD_PX,
    tapOpensEdit: true,
    dragSensitivity,
  });

  const knobContainerRef = useRef<HTMLDivElement>(null);
  const [tooltipSide, setTooltipSide] = useState<"left" | "right">("right");
  const guidance = useKnobGuidance();

  const rotation = START_ANGLE_DEG + control.position * ROTATION_RANGE_DEG;
  const containerClass = size === "lg" ? "h-44" : "h-20";

  // Wrap-around tooltip: flip to whichever side has more viewport room, mirroring
  // the original hand-built knob so it never renders off-screen at the edges.
  const updateTooltipSide = useCallback(() => {
    const node = knobContainerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;
    setTooltipSide(spaceLeft > spaceRight ? "left" : "right");
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;
      updateTooltipSide();

      // Drive the first-use guidance heuristic alongside the hook's own drag
      // tracking; window listeners self-tear-down on release.
      guidance.handleStart({ x: event.clientX, y: event.clientY });
      const onMove = (ev: PointerEvent) =>
        guidance.handleMove({ x: ev.clientX, y: ev.clientY });
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);

      control.handlers.onPointerDown(event);
    },
    [disabled, updateTooltipSide, guidance, control.handlers],
  );

  return (
    <div
      data-slot="rotary-knob"
      data-disabled={disabled || undefined}
      data-dragging={control.isDragging || undefined}
      className={cn(
        "flex aspect-square flex-col items-center justify-center",
        containerClass,
        disabled && "opacity-50",
        className,
      )}
    >
      <Tooltip open={control.isDragging}>
        <TooltipTrigger asChild>
          <div
            ref={knobContainerRef}
            className="relative flex aspect-square h-4/5 touch-none items-center justify-center rounded-full select-none"
            style={{ touchAction: "none" }}
          >
            <Coachmark
              visible={guidance.showCoachmark}
              message="Drag up/down to adjust"
              anchorRef={knobContainerRef}
            />

            {/* Hitbox - rotates with the value; carries the interaction. */}
            <div
              {...control.ariaProps}
              onKeyDown={control.handlers.onKeyDown}
              onDoubleClick={control.handlers.onDoubleClick}
              onWheel={control.handlers.onWheel}
              onPointerDown={handlePointerDown}
              aria-labelledby={hideLabel ? undefined : `${control.id}-label`}
              className={cn(
                "absolute z-1 aspect-square h-5/6 origin-center touch-none rounded-full outline-none select-none",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
              )}
              style={{ transform: `rotate(${rotation}deg)` }}
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
            </div>

            {/* Knob base - fixed and motionless so the neumorphic shadow reads. */}
            <div
              className="border-shadow-30 flex aspect-square h-4/5 items-center justify-center rounded-full border shadow-(--shadow-neu-tall)"
              style={{ background: "var(--knob-gradient)" }}
            >
              {/* Raised knob edge */}
              <div
                className="border-shadow-30 relative flex h-3/5 w-3/5 items-center justify-center rounded-full border shadow-(--shadow-neu-tall-raised)"
                style={{ background: "var(--knob-gradient)" }}
              >
                {/* Raised knob inner circle */}
                <div className="border-shadow-10 bg-knob raised absolute top-1/2 left-1/2 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full border shadow-(--knob-shadow-center)" />
              </div>
            </div>

            {/* Outer ticks */}
            {outerTickCount > 0 && (
              <KnobTicks outerTickCount={outerTickCount} />
            )}

            {/* Type-in editor - overlays the dial centre while editing. */}
            {control.isEditing && (
              <input
                {...control.editProps}
                aria-label={`${label} value`}
                onFocus={(event) => event.target.select()}
                className={cn(
                  "bg-surface text-foreground absolute top-1/2 left-1/2 z-10 w-4/5 -translate-x-1/2 -translate-y-1/2",
                  "rounded-sm px-1 text-center text-xs leading-none outline-none",
                )}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          {control.displayValue}
        </TooltipContent>
      </Tooltip>

      {!hideLabel && (
        <div className="flex items-center justify-center">
          <Label id={`${control.id}-label`} className="text-xs">
            {label}
          </Label>
        </div>
      )}
    </div>
  );
}

export { RotaryKnob };
export type { RotaryKnobProps, KnobSize };
