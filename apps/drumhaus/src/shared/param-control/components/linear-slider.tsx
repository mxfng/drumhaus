import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/utils";
import { Label, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui";
import { DEFAULT_DRAG_SENSITIVITY } from "../lib/descriptor";
import { Knob, useKnob } from "../primitives/knob";
import type { ParamControlFutureSeams, ParamDescriptor } from "../types";

type SliderOrientation = "horizontal" | "vertical";

/**
 * Movement (px) before a press on the track counts as a drag. Below it the
 * press is a no-op: the track is drag-only, so a click that never moves changes
 * nothing and opens no editor (type-in lives on the label).
 */
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
} & ParamControlFutureSeams;

/** The styling-only props threaded from `LinearSlider` down to its body. */
type LinearSliderBodyProps = {
  disabled: boolean;
  label: string;
  orientation: SliderOrientation;
  length?: number;
  thickness: number;
  thumbSize: number;
  hideLabel: boolean;
  className?: string;
};

/**
 * The neumorphic fader skin, composed on the headless `Knob` primitive. Owns
 * look only (recessed track, raised thumb, on-drag tooltip); all behaviour and
 * the canonical-only contract live in the primitive, read here through
 * `useKnob()`.
 */
function LinearSliderBody({
  disabled,
  label,
  orientation,
  length,
  thickness,
  thumbSize,
  hideLabel,
  className,
}: LinearSliderBodyProps) {
  const { control, descriptor } = useKnob();
  const { position } = control;
  const isVertical = orientation === "vertical";

  // The track fills its axis by default (mirroring the original `flex-1` fader).
  const trackStyle: CSSProperties = isVertical
    ? { width: thickness, height: length ?? "100%" }
    : { width: length ?? "100%", height: thickness };

  // The thumb is inset so it never overhangs the track ends: its edge travels
  // from 0 to `length - thumbSize`, keeping the thumb fully within the track at
  // both extremes (center range `thumbSize/2` -> `length - thumbSize/2`). This
  // matches the geometry of the original Radix-backed fader pixel-for-pixel; a
  // raw `position * 100%` center would let the thumb spill half its size past
  // each end. Only the cross-axis uses `translate` to center the thumb.
  const insetOffset = `calc(${position} * (100% - ${thumbSize}px))`;
  const thumbStyle: CSSProperties = isVertical
    ? {
        width: thumbSize,
        height: thumbSize,
        bottom: insetOffset,
        left: "50%",
        transform: "translateX(-50%)",
      }
    : {
        width: thumbSize,
        height: thumbSize,
        left: insetOffset,
        top: "50%",
        transform: "translateY(-50%)",
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
          <Knob.Track
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
            <Knob.Indicator
              className="bg-surface font-pixel absolute block rounded-full border"
              style={thumbStyle}
              aria-hidden="true"
            />
          </Knob.Track>
        </TooltipTrigger>
        <TooltipContent side={isVertical ? "right" : "top"}>
          <Knob.Value />
        </TooltipContent>
      </Tooltip>

      {!hideLabel &&
        (control.isEditing ? (
          // Type-in editor - the caption label becomes an input in place.
          <input
            {...control.editProps}
            aria-label={`${label} value`}
            onFocus={(event) => event.target.select()}
            className={cn(
              "bg-surface text-foreground w-14 rounded-sm px-1 text-center",
              "text-xs leading-none outline-none",
              !isVertical && "mt-2",
            )}
          />
        ) : (
          <Label
            id={`${control.id}-label`}
            className={cn(
              "text-center",
              !isVertical && "mt-2",
              descriptor.parse && "cursor-text",
            )}
            onDoubleClick={descriptor.parse ? control.beginEdit : undefined}
          >
            {label}
          </Label>
        ))}
    </div>
  );
}

/**
 * The linear (fader) presentation of the descriptor-driven control: the
 * hand-built hardware track and thumb driven by the headless `Knob` primitive
 * (whose engine is `useParamControl`). The body owns look only; all behaviour
 * and the canonical-only contract live in the primitive.
 *
 * The resting fader shows no number - the value surfaces in a wrap-around
 * tooltip only while dragging, exactly as the original. The track is drag-only:
 * a press without drag changes nothing. Type-in is a deliberate double-click on
 * the caption label (swaps the word for an input; Enter/blur commits, Esc
 * cancels), and only when the descriptor can `parse`. The drag reads whichever
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
  // Pinned at the instance level so a descriptor's `dragSensitivity` (tuned
  // for the tighter screen-bar value fields, e.g. bpm/swing) never changes
  // the fader feel; pass the prop to retune a specific fader.
  dragSensitivity = DEFAULT_DRAG_SENSITIVITY,
  className,
  // Declared future seams; not wired yet.
  modulationRange: _modulationRange,
  dragMode: _dragMode,
  onContextMenuRequest: _onContextMenuRequest,
}: LinearSliderProps<T>) {
  return (
    <Knob.Root
      descriptor={descriptor}
      value={value}
      onChange={onChange}
      onGestureStart={onGestureStart}
      onGestureEnd={onGestureEnd}
      disabled={disabled}
      label={label}
      tabbable={tabbable}
      id={id}
      dragAxis={orientation === "vertical" ? "vertical" : "horizontal"}
      dragThreshold={DRAG_THRESHOLD_PX}
      dragSensitivity={dragSensitivity}
    >
      <LinearSliderBody
        disabled={disabled}
        label={label}
        orientation={orientation}
        length={length}
        thickness={thickness}
        thumbSize={thumbSize}
        hideLabel={hideLabel}
        className={className}
      />
    </Knob.Root>
  );
}

export { LinearSlider };
export type { LinearSliderProps, SliderOrientation };
