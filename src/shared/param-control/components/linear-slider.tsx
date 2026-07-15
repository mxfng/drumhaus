import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/utils";
import { useParamControl } from "../hooks/use-param-control";
import type { ParamDescriptor, RotaryKnobFutureSeams } from "../types";

type SliderOrientation = "horizontal" | "vertical";

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
  /** Length of the track along its axis, in pixels. */
  length?: number;
  /** Thickness of the track across its axis, in pixels. */
  thickness?: number;
  /** Diameter of the thumb, in pixels. */
  thumbSize?: number;
  /** Hide the caption label. */
  hideLabel?: boolean;
  /** Hide the value readout. */
  hideValue?: boolean;
  className?: string;
} & RotaryKnobFutureSeams;

/**
 * The linear (fader) presentation of the descriptor-driven control. A thin skin
 * over `useParamControl`: it owns look only (track, fill, thumb, readout),
 * while all behavior and the canonical-only contract live in the hook.
 *
 * The drag reads whichever axis the orientation names (up / right increases),
 * always in normalized space, so `dragSensitivity`, fine drag, and detents work
 * identically to the knob. FUTURE seams (modulation-range arc, drag mode,
 * context menu) are declared on the props but intentionally not implemented.
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
  length = 140,
  thickness = 12,
  thumbSize = 16,
  hideLabel = false,
  hideValue = false,
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
  });

  const { position, bipolar } = control;
  const isVertical = orientation === "vertical";

  // Fill spans from the origin (bottom / left, or centre for bipolar) to the thumb.
  const fillStart = bipolar ? 0.5 : 0;
  const lo = Math.min(fillStart, position);
  const hi = Math.max(fillStart, position);

  const trackStyle: CSSProperties = isVertical
    ? { width: thickness, height: length }
    : { width: length, height: thickness };

  const fillStyle: CSSProperties = isVertical
    ? { bottom: `${lo * 100}%`, height: `${(hi - lo) * 100}%`, width: "100%" }
    : { left: `${lo * 100}%`, width: `${(hi - lo) * 100}%`, height: "100%" };

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
        "flex flex-col items-center gap-2 select-none",
        disabled && "opacity-50",
        className,
      )}
    >
      <div
        {...control.handlers}
        {...control.ariaProps}
        aria-orientation={orientation}
        aria-labelledby={hideLabel ? undefined : `${control.id}-label`}
        className={cn(
          "relative touch-none rounded-full outline-none",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
          isVertical ? "cursor-ns-resize" : "cursor-ew-resize",
        )}
        style={{ ...trackStyle, touchAction: "none" }}
      >
        {/* Track */}
        <div
          className="absolute inset-0 rounded-full bg-(--slider-track-bg) shadow-(--slider-track-shadow)"
          aria-hidden="true"
        />
        {/* Fill */}
        <div
          className="bg-primary absolute rounded-full"
          style={fillStyle}
          aria-hidden="true"
        />
        {/* Thumb */}
        <div
          className="bg-surface absolute rounded-full border shadow-sm"
          style={thumbStyle}
          aria-hidden="true"
        />
      </div>

      {!hideValue &&
        (control.isEditing ? (
          <input
            {...control.editProps}
            aria-label={`${label} value`}
            className={cn(
              "bg-surface text-foreground w-16 rounded-sm px-1 text-center text-xs",
              "outline-none",
            )}
          />
        ) : (
          <button
            type="button"
            data-slot="linear-slider-value"
            disabled={disabled || !descriptor.parse}
            onClick={control.beginEdit}
            className={cn(
              "text-foreground-muted text-xs tabular-nums",
              descriptor.parse && "hover:text-foreground cursor-text",
            )}
          >
            {control.displayValue}
          </button>
        ))}

      {!hideLabel && (
        <span
          id={`${control.id}-label`}
          data-slot="linear-slider-label"
          className="text-foreground-muted text-xs"
        >
          {label}
        </span>
      )}
    </div>
  );
}

export { LinearSlider };
export type { LinearSliderProps, SliderOrientation };
