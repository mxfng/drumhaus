import { cn } from "@/shared/lib/utils";
import { useParamControl } from "../hooks/use-param-control";
import type { ParamDescriptor, RotaryKnobFutureSeams } from "../types";

/** Sweep of the dial, in degrees, centred on 12 o'clock. */
const ROTATION_RANGE_DEG = 270;
const START_ANGLE_DEG = -ROTATION_RANGE_DEG / 2;

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
  /** Diameter in pixels. */
  size?: number;
  /** Hide the caption label under the dial. */
  hideLabel?: boolean;
  /** Hide the value readout. */
  hideValue?: boolean;
  className?: string;
} & RotaryKnobFutureSeams;

/** Point on the dial circle for a normalized [0,1] position. */
function polarToXY(cx: number, cy: number, r: number, position: number) {
  const angleDeg = START_ANGLE_DEG + position * ROTATION_RANGE_DEG;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
    angleDeg,
  };
}

/** SVG arc path between two normalized positions along the dial circle. */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const start = polarToXY(cx, cy, r, lo);
  const end = polarToXY(cx, cy, r, hi);
  const largeArc = (hi - lo) * ROTATION_RANGE_DEG > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * The rotary presentation of the descriptor-driven control. A thin skin over
 * `useParamControl`: it owns look only (track, fill, indicator, readout), while
 * all behavior and the canonical-only contract live in the hook.
 *
 * FUTURE seams (modulation-range arc, circular drag mode, context menu) are
 * declared on the props but intentionally not implemented (see
 * docs/knob-primitive.md).
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
  size = 72,
  hideLabel = false,
  hideValue = false,
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
  });

  const { position, bipolar } = control;

  const stroke = size * 0.09;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const fillStart = bipolar ? 0.5 : 0;
  const indicator = polarToXY(cx, cy, r, position);
  const indicatorInner = polarToXY(cx, cy, r * 0.42, position);

  return (
    <div
      data-slot="rotary-knob"
      data-disabled={disabled || undefined}
      data-dragging={control.isDragging || undefined}
      className={cn(
        "flex flex-col items-center gap-1 select-none",
        disabled && "opacity-50",
        className,
      )}
    >
      <div
        {...control.handlers}
        {...control.ariaProps}
        aria-labelledby={hideLabel ? undefined : `${control.id}-label`}
        className={cn(
          "relative touch-none rounded-full outline-none",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
        )}
        style={{ width: size, height: size, touchAction: "none" }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <path
            d={describeArc(cx, cy, r, 0, 1)}
            fill="none"
            className="stroke-border"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={describeArc(cx, cy, r, fillStart, position)}
            fill="none"
            className="stroke-primary"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Indicator */}
          <line
            x1={indicatorInner.x}
            y1={indicatorInner.y}
            x2={indicator.x}
            y2={indicator.y}
            className="stroke-foreground"
            strokeWidth={stroke * 0.6}
            strokeLinecap="round"
          />
        </svg>
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
            data-slot="rotary-knob-value"
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
          data-slot="rotary-knob-label"
          className="text-foreground-muted text-xs"
        >
          {label}
        </span>
      )}
    </div>
  );
}

export { RotaryKnob };
export type { RotaryKnobProps };
