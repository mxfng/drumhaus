import { cn } from "@/shared/lib/utils";
import { useParamControl } from "../hooks/use-param-control";
import type { ParamDescriptor } from "../types";

/** Movement (px) before a press on the field counts as a drag rather than a tap. */
const DRAG_THRESHOLD_PX = 3;

type ValueFieldProps<T> = {
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
  /** Show the label inline before the value (default true). */
  showLabel?: boolean;
  /** Per-instance override for the normalized drag delta per pixel. */
  dragSensitivity?: number;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
};

/**
 * The clickable value-field presentation of the descriptor-driven control: a
 * number readout the user drags to change, taps to type, or steps with the
 * keyboard. A thin skin over `useParamControl`; all behavior and the
 * canonical-only contract live in the hook.
 *
 * One element does double duty, so it sets a small drag threshold: a press that
 * moves is a vertical drag (up increases), a press that does not is a tap that
 * opens the type-in editor. Because a tap is the type-in affordance, reset is
 * Delete / Backspace (the hook) rather than double-click.
 */
function ValueField<T>({
  descriptor,
  value,
  onChange,
  onGestureStart,
  onGestureEnd,
  disabled = false,
  label,
  tabbable = true,
  id,
  showLabel = true,
  dragSensitivity,
  className,
  labelClassName,
  valueClassName,
}: ValueFieldProps<T>) {
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

  const { handlers } = control;

  return (
    <div
      data-slot="value-field"
      data-disabled={disabled || undefined}
      data-dragging={control.isDragging || undefined}
      onPointerDown={handlers.onPointerDown}
      onKeyDown={handlers.onKeyDown}
      onWheel={handlers.onWheel}
      {...control.ariaProps}
      className={cn(
        "focus-visible:ring-ring relative inline-block touch-none rounded-sm outline-none select-none focus-visible:ring-2",
        control.isDragging ? "cursor-ns-resize" : "cursor-pointer",
        disabled && "opacity-50",
        className,
      )}
      style={{ touchAction: "none" }}
    >
      {/* The display stays in flow (invisible while editing) so the field keeps
          its width when the input overlays it, even in content-sized layouts. */}
      <span className={cn(control.isEditing && "invisible")}>
        {showLabel && (
          <span
            id={`${control.id}-label`}
            data-slot="value-field-label"
            className={cn("text-foreground-muted", labelClassName)}
          >
            {label}{" "}
          </span>
        )}
        <span
          data-slot="value-field-value"
          className={cn("tabular-nums", valueClassName)}
        >
          {control.displayValue}
        </span>
      </span>

      {control.isEditing && (
        <input
          {...control.editProps}
          aria-label={`${label} value`}
          onFocus={(event) => event.target.select()}
          className={cn(
            "text-foreground absolute inset-0 m-0 w-full min-w-0 rounded-none border-none bg-transparent p-0 text-center leading-none outline-none",
          )}
        />
      )}
    </div>
  );
}

export { ValueField };
export type { ValueFieldProps };
