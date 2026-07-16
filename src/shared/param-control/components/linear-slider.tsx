import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/utils";
import { Label, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui";
import { useParamControl } from "../hooks/use-param-control";
import { KNOB_DRAG_SENSITIVITY } from "../lib/descriptor";
import type { ParamDescriptor, RotaryKnobFutureSeams } from "../types";

type SliderOrientation = "horizontal" | "vertical";

/** Movement (px) before a press counts as a drag rather than a tap-to-type. */
const DRAG_THRESHOLD_PX = 3;

type LinearSliderProps<T> = {
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
  /** "horizontal" (default) or "vertical" fader. */
  orientation?: SliderOrientation;
  /** Length of the track along its axis, in pixels (defaults to filling the axis). */
  length?: number;
  /** Thickness of the track across its axis, in pixels. */
  thickness?: number;
  /** Diameter of the thumb, in pixels. */
  thumbSize?: number;
  /** Hide the caption label. */
  hideLabel?: boolean;
  /** Per-instance override for the normalized drag delta per pixel. */
  dragSensitivity?: number;
  className?: string;
} & RotaryKnobFutureSeams;

/**
 * The linear (fader) presentation of the descriptor-driven control: the
 * hand-built hardware track and thumb driven by `useParamControl`. The body
 * owns look only (recessed track, raised thumb); all behaviour and the
 * canonical-only contract live in the hook.
 *
 * The resting fader shows no number - the value surfaces in a wrap-around
 * tooltip only while dragging, exactly as the original. The drag reads whichever
 * axis the orientation names (up / right increases), always in normalized space,
 * so `dragSensitivity`, fine drag, and detents work identically to the knob.
 * FUTURE seams are declared on the props but intentionally not implemented.
 */
function LinearSlider<T>({
  descriptor,
  value,
  onChange,
  onGestureStart,
  onGestureEnd,
  disabled = false,
  label,
  tabbable = true,
  id,
  orientation = "horizontal",
  length,
  thickness = 12,
  thumbSize = 16,
  hideLabel = false,
  dragSensitivity = KNOB_DRAG_SENSITIVITY,
  className,
  // Declared future seams; not wired yet.
  modulationRange: _modulationRange,
  dragMode: _dragMode,
  onContextMenuRequest: _onContextMenuRequest,
}: LinearSliderProps<T>) {
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
    dragAxis: orientation === "vertical" ? "vertical" : "horizontal",
    dragThreshold: DRAG_THRESHOLD_PX,
    tapOpensEdit: true,
    dragSensitivity,
  });

  const { position } = control;
  const isVertical = orientation === "vertical";

  // The track fills its axis by default (mirroring the original `flex-1` fader).
  const trackStyle: CSSProperties = isVertical
    ? { width: thickness, height: length ?? "100%" }
    : { width: length ?? "100%", height: thickness };

  const thumbStyle: CSSProperties = isVertical
    ? {
        width: thumbSize,
        height: thumbSize,
        bottom: `${position * 100}%`,
        left: "50%",
        transform: "translate(-50%, 50%)",
      }
    : {
        width: thumbSize,
        height: thumbSize,
        left: `${position * 100}%`,
        top: "50%",
        transform: "translate(-50%, -50%)",
      };

  return (
    <div
      data-slot="linear-slider"
      data-orientation={orientation}
      data-disabled={disabled || undefined}
      data-dragging={control.isDragging || undefined}
      className={cn(
        "flex select-none",
        isVertical
          ? "h-full w-fit flex-col items-center gap-2"
          : "w-full flex-col gap-2",
        disabled && "opacity-50",
        className,
      )}
    >
      <Tooltip open={control.isDragging}>
        <TooltipTrigger asChild>
          <div
            {...control.handlers}
            {...control.ariaProps}
            aria-orientation={orientation}
            aria-labelledby={hideLabel ? undefined : `${control.id}-label`}
            className={cn(
              "relative touch-none rounded-lg outline-none",
              "bg-(--slider-track-bg) shadow-(--slider-track-shadow)",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
              isVertical ? "flex-1 cursor-ns-resize" : "cursor-ew-resize",
            )}
            style={{ ...trackStyle, touchAction: "none" }}
          >
            {/* Thumb */}
            <div
              className="bg-surface font-pixel absolute block rounded-full border"
              style={thumbStyle}
              aria-hidden="true"
            />

            {/* Type-in editor - overlays the track centre while editing. */}
            {control.isEditing && (
              <input
                {...control.editProps}
                aria-label={`${label} value`}
                onFocus={(event) => event.target.select()}
                className={cn(
                  "bg-surface text-foreground absolute top-1/2 left-1/2 z-10 w-14 -translate-x-1/2 -translate-y-1/2",
                  "rounded-sm px-1 text-center text-xs leading-none outline-none",
                )}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={isVertical ? "right" : "top"}>
          {control.displayValue}
        </TooltipContent>
      </Tooltip>

      {!hideLabel && (
        <Label
          id={`${control.id}-label`}
          className={cn("text-center", !isVertical && "mt-2")}
        >
          {label}
        </Label>
      )}
    </div>
  );
}

export { LinearSlider };
export type { LinearSliderProps, SliderOrientation };
