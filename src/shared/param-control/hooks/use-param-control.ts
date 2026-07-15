import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  canonicalToNormalized,
  DEFAULT_DRAG_SENSITIVITY,
  DEFAULT_FINE_DRAG_FACTOR,
  endpointValue,
  formatValue,
  normalizedToCanonical,
  parseValue,
  resetValue,
  stepValue,
} from "../lib/descriptor";
import { clamp01 } from "../lib/taper";
import type { ParamDescriptor } from "../types";

interface UseParamControlProps<T> {
  descriptor: ParamDescriptor<T>;
  /** Current value, in CANONICAL units. */
  value: T;
  /** Emits a new value, in CANONICAL units. */
  onChange: (value: T) => void;
  /** Fired once when a gesture begins (drag start, edit open, discrete commit). */
  onGestureStart?: () => void;
  /** Fired once when a gesture ends. Distinct from onChange. */
  onGestureEnd?: () => void;
  disabled?: boolean;
  label: string;
  /** Opt-in tab order: false removes the control from the tab sequence. */
  tabbable?: boolean;
  id?: string;
}

interface SliderAriaProps {
  role: "slider";
  tabIndex: number;
  "aria-label": string;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuenow": number;
  /** The display string ("2.5 kHz"), never the raw number. */
  "aria-valuetext": string;
  "aria-disabled": boolean | undefined;
}

interface EditInputProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  autoFocus: boolean;
}

interface UseParamControlResult {
  /** Normalized [0, 1] position for rendering (rotation, fill). Never public API. */
  position: number;
  /** Display string projected from the canonical value. */
  displayValue: string;
  isDragging: boolean;
  isEditing: boolean;
  ariaProps: SliderAriaProps;
  /** Spread onto the interactive slider element. */
  handlers: {
    onPointerDown: (event: React.PointerEvent) => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
    onDoubleClick: (event: React.MouseEvent) => void;
    onWheel: (event: React.WheelEvent) => void;
  };
  /** Open the type-in editor (no-op when the descriptor has no `parse`). */
  beginEdit: () => void;
  /** Spread onto the type-in <input> while `isEditing`. */
  editProps: EditInputProps;
  /** Reset to the descriptor default, as its own bracketed gesture. */
  reset: () => void;
  /** Stable id for wiring aria-labelledby / htmlFor. */
  id: string;
  /** Whether this descriptor is bipolar (center-origin fill). */
  bipolar: boolean;
}

/**
 * Headless core for the descriptor-driven parameter control.
 *
 * Public API speaks CANONICAL units only; the normalized [0, 1] position is a
 * strictly-internal transport. A gesture holds a raw, unrounded position and
 * rounds only at commit, so stepped params never accumulate drift and fine
 * drag can move sub-step amounts (docs/knob-primitive.md).
 */
function useParamControl<T>({
  descriptor,
  value,
  onChange,
  onGestureStart,
  onGestureEnd,
  disabled = false,
  label,
  tabbable = true,
  id,
}: UseParamControlProps<T>): UseParamControlResult {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Raw, unrounded position held through a drag gesture.
  const rawPositionRef = useRef(0);
  const lastYRef = useRef(0);

  // Latest props referenced by window listeners without re-subscribing.
  const latest = useRef({ descriptor, onChange });
  latest.current = { descriptor, onChange };

  const position = canonicalToNormalized(descriptor, value);
  const displayValue = formatValue(descriptor, value);
  const bipolar = descriptor.polarity === "bipolar";

  const numeric = typeof descriptor.min === "number";
  const descriptorMin = numeric ? (descriptor.min as unknown as number) : 0;
  const descriptorMax = numeric ? (descriptor.max as unknown as number) : 1;
  const descriptorNow = numeric ? (value as unknown as number) : position;

  /** Commit a discrete change as its own bracketed gesture (own undo unit). */
  const commitDiscrete = useCallback(
    (next: T) => {
      onGestureStart?.();
      onChange(next);
      onGestureEnd?.();
    },
    [onChange, onGestureStart, onGestureEnd],
  );

  const reset = useCallback(() => {
    if (disabled) return;
    commitDiscrete(resetValue(descriptor));
  }, [disabled, commitDiscrete, descriptor]);

  // --- Type-in editor ---

  const beginEdit = useCallback(() => {
    if (disabled || !descriptor.parse) return;
    setEditText(displayValue);
    setIsEditing(true);
    onGestureStart?.();
  }, [disabled, descriptor, displayValue, onGestureStart]);

  const commitEdit = useCallback(() => {
    const parsed = parseValue(descriptor, editText);
    if (parsed !== null) onChange(parsed);
    setIsEditing(false);
    onGestureEnd?.();
  }, [descriptor, editText, onChange, onGestureEnd]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    onGestureEnd?.();
  }, [onGestureEnd]);

  const editProps: EditInputProps = useMemo(
    () => ({
      value: editText,
      onChange: (event) => setEditText(event.target.value),
      onKeyDown: (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitEdit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancelEdit();
        }
      },
      onBlur: () => commitEdit(),
      autoFocus: true,
    }),
    [editText, commitEdit, cancelEdit],
  );

  // --- Drag ---

  const handlePointerMove = useCallback((event: PointerEvent) => {
    event.preventDefault();
    const { descriptor: d, onChange: emit } = latest.current;

    const dyIncrement = lastYRef.current - event.clientY; // up = positive
    lastYRef.current = event.clientY;

    const sensitivity = d.dragSensitivity ?? DEFAULT_DRAG_SENSITIVITY;
    const fine = event.shiftKey;
    const factor = fine ? (d.fineDragFactor ?? DEFAULT_FINE_DRAG_FACTOR) : 1;

    rawPositionRef.current = clamp01(
      rawPositionRef.current + dyIncrement * sensitivity * factor,
    );
    emit(normalizedToCanonical(d, rawPositionRef.current, { fine }));
  }, []);

  const endDrag = useCallback(() => {
    setIsDragging(false);
    onGestureEnd?.();
  }, [onGestureEnd]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;
      event.preventDefault();
      rawPositionRef.current = canonicalToNormalized(descriptor, value);
      lastYRef.current = event.clientY;
      setIsDragging(true);
      onGestureStart?.();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // best-effort capture
      }
    },
    [disabled, descriptor, value, onGestureStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (event: PointerEvent) => handlePointerMove(event);
    const onUp = () => endDrag();
    const options: AddEventListenerOptions = { passive: false };

    window.addEventListener("pointermove", onMove, options);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [isDragging, handlePointerMove, endDrag]);

  // --- Keyboard, wheel, double-click ---

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled || isEditing) return;

      switch (event.key) {
        case "ArrowUp":
        case "ArrowRight":
          event.preventDefault();
          commitDiscrete(stepValue(descriptor, value, 1, false));
          break;
        case "ArrowDown":
        case "ArrowLeft":
          event.preventDefault();
          commitDiscrete(stepValue(descriptor, value, -1, false));
          break;
        case "PageUp":
          event.preventDefault();
          commitDiscrete(stepValue(descriptor, value, 1, true));
          break;
        case "PageDown":
          event.preventDefault();
          commitDiscrete(stepValue(descriptor, value, -1, true));
          break;
        case "Home":
          event.preventDefault();
          commitDiscrete(endpointValue(descriptor, "min"));
          break;
        case "End":
          event.preventDefault();
          commitDiscrete(endpointValue(descriptor, "max"));
          break;
        case "Delete":
        case "Backspace":
          event.preventDefault();
          commitDiscrete(resetValue(descriptor));
          break;
        case "Enter":
          if (descriptor.parse) {
            event.preventDefault();
            beginEdit();
          }
          break;
      }
    },
    [disabled, isEditing, descriptor, value, commitDiscrete, beginEdit],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return;
      event.preventDefault();
      commitDiscrete(resetValue(descriptor));
    },
    [disabled, commitDiscrete, descriptor],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (disabled) return;
      // No smooth-wheel: one notch per event, honoring interval/stepCount.
      const direction = event.deltaY < 0 ? 1 : -1;
      commitDiscrete(stepValue(descriptor, value, direction, false));
    },
    [disabled, commitDiscrete, descriptor, value],
  );

  const ariaProps: SliderAriaProps = {
    role: "slider",
    tabIndex: disabled || !tabbable ? -1 : 0,
    "aria-label": label,
    "aria-valuemin": descriptorMin,
    "aria-valuemax": descriptorMax,
    "aria-valuenow": descriptorNow,
    "aria-valuetext": displayValue,
    "aria-disabled": disabled || undefined,
  };

  return {
    position,
    displayValue,
    isDragging,
    isEditing,
    ariaProps,
    handlers: {
      onPointerDown: handlePointerDown,
      onKeyDown: handleKeyDown,
      onDoubleClick: handleDoubleClick,
      onWheel: handleWheel,
    },
    beginEdit,
    editProps,
    reset,
    id: controlId,
    bipolar,
  };
}

export { useParamControl };
export type { UseParamControlProps, UseParamControlResult };
