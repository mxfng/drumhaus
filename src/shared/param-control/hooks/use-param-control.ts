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

/** Which screen axis a drag reads: knobs and value fields use "vertical". */
type DragAxis = "vertical" | "horizontal";

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
  /**
   * Which screen axis drives the drag. "vertical" (up increases) is the default
   * for knobs and value fields; a horizontal fader passes "horizontal" (right
   * increases). The delta is always computed in normalized space, so a single
   * `dragSensitivity` is correct across every range and taper.
   */
  dragAxis?: DragAxis;
  /**
   * Pixels of movement before a press becomes a drag. 0 (the default) starts
   * dragging immediately on pointer-down, as a knob or fader thumb does. A
   * value field sets a small threshold so a click that never moves is treated
   * as a tap (type-in) rather than a zero-delta drag.
   */
  dragThreshold?: number;
  /** When true, a tap (a press released below `dragThreshold`) opens the type-in editor. */
  tapOpensEdit?: boolean;
  /**
   * Per-instance override for the normalized drag delta per pixel. Falls back to
   * the descriptor's `dragSensitivity`, then the global default. Lets one
   * descriptor drive presentations with different feels (e.g. the transport
   * knob vs the tighter screen-bar value field).
   */
  dragSensitivity?: number;
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

/** Pointer-drag phase: idle, pressed-but-undecided, or actively dragging. */
type DragPhase = "idle" | "pending" | "dragging";

/**
 * Headless core for the descriptor-driven parameter control.
 *
 * Public API speaks CANONICAL units only; the normalized [0, 1] position is a
 * strictly-internal transport. A gesture holds a raw, unrounded position and
 * rounds only at commit, so stepped params never accumulate drift and fine
 * drag can move sub-step amounts (docs/knob-primitive.md).
 *
 * The same core powers every presentation (knob, fader, value field). A drag
 * reads whichever screen `dragAxis` names, and an optional `dragThreshold`
 * lets a presentation distinguish a tap (type-in) from a drag on one element.
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
  dragAxis = "vertical",
  dragThreshold = 0,
  tapOpensEdit = false,
  dragSensitivity,
}: UseParamControlProps<T>): UseParamControlResult {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // True while window pointer listeners are attached (pending OR dragging).
  const [tracking, setTracking] = useState(false);

  // Drag state held through a gesture, never re-rendering per move.
  const phaseRef = useRef<DragPhase>("idle");
  const startPointRef = useRef({ x: 0, y: 0 });
  const lastPointRef = useRef({ x: 0, y: 0 });
  // Raw, unrounded position held through a drag gesture.
  const rawPositionRef = useRef(0);

  // Latest props referenced by window listeners without re-subscribing.
  const latest = useRef({
    descriptor,
    onChange,
    onGestureStart,
    onGestureEnd,
    dragAxis,
    dragThreshold,
    tapOpensEdit,
    dragSensitivity,
  });
  latest.current = {
    descriptor,
    onChange,
    onGestureStart,
    onGestureEnd,
    dragAxis,
    dragThreshold,
    tapOpensEdit,
    dragSensitivity,
  };

  const position = canonicalToNormalized(descriptor, value);
  const displayValue = formatValue(descriptor, value);
  const bipolar = descriptor.polarity === "bipolar";

  const numeric = typeof descriptor.min === "number";
  const rawMin = numeric ? (descriptor.min as unknown as number) : 0;
  const rawMax = numeric ? (descriptor.max as unknown as number) : 1;
  const rawNow = numeric ? (value as unknown as number) : position;
  // ARIA numbers must be finite. A volume control's silence sentinel
  // (-Infinity) - and defensively any non-finite bound - is not a valid ARIA
  // number, so substitute the finite floor; `aria-valuetext` still carries the
  // human label ("-∞ dB").
  const ariaMin = Number.isFinite(rawMin) ? rawMin : rawMax;
  const ariaMax = Number.isFinite(rawMax) ? rawMax : rawMin;
  const ariaNow = Number.isFinite(rawNow) ? rawNow : ariaMin;

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

  // Referenced by the window pointer-up handler (a tap) without re-subscribing.
  const beginEditRef = useRef(beginEdit);
  beginEditRef.current = beginEdit;

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

  const endGesture = useCallback((cancelled: boolean) => {
    const phase = phaseRef.current;
    phaseRef.current = "idle";
    setTracking(false);
    if (phase === "dragging") {
      setIsDragging(false);
      latest.current.onGestureEnd?.();
    } else if (
      phase === "pending" &&
      !cancelled &&
      latest.current.tapOpensEdit
    ) {
      // A press that never crossed the threshold is a tap: open the editor.
      beginEditRef.current();
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      // Chorded button presses on one pointer don't fire pointerdown/pointerup
      // per the pointer events spec: only the first button down and the last
      // button up do. Releasing the primary button while another is held (e.g.
      // a right-click chord) arrives as a pointermove with bit 0 of `buttons`
      // cleared, so end the gesture here or the drag outlives the button
      // (#402). This also self-heals any other missed-pointerup path. Touch
      // and pen keep bit 0 set while in contact, so they are unaffected.
      // Cancelled (not a tap): a chorded press should never open the editor.
      if ((event.buttons & 1) === 0) {
        endGesture(true);
        return;
      }

      event.preventDefault();
      const {
        descriptor: d,
        onChange: emit,
        dragAxis: axis,
        dragThreshold: threshold,
      } = latest.current;

      const x = event.clientX;
      const y = event.clientY;

      // Pending press: promote to a drag only once movement clears the threshold.
      if (phaseRef.current === "pending") {
        const moved =
          axis === "horizontal"
            ? Math.abs(x - startPointRef.current.x)
            : Math.abs(y - startPointRef.current.y);
        if (moved < threshold) return;
        phaseRef.current = "dragging";
        lastPointRef.current = { x, y };
        setIsDragging(true);
        latest.current.onGestureStart?.();
        return;
      }

      if (phaseRef.current !== "dragging") return;

      // Up (vertical) or right (horizontal) increases the value.
      const increment =
        axis === "horizontal"
          ? x - lastPointRef.current.x
          : lastPointRef.current.y - y;
      lastPointRef.current = { x, y };

      const sensitivity =
        latest.current.dragSensitivity ??
        d.dragSensitivity ??
        DEFAULT_DRAG_SENSITIVITY;
      const fine = event.shiftKey;
      const factor = fine ? (d.fineDragFactor ?? DEFAULT_FINE_DRAG_FACTOR) : 1;

      rawPositionRef.current = clamp01(
        rawPositionRef.current + increment * sensitivity * factor,
      );
      emit(normalizedToCanonical(d, rawPositionRef.current, { fine }));
    },
    [endGesture],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;
      // Only the primary button (or touch/pen contact, also button 0) starts a
      // gesture: a right- or middle-click never begins a drag or edit (#402).
      if (event.button !== 0) return;
      event.preventDefault();
      rawPositionRef.current = canonicalToNormalized(descriptor, value);
      startPointRef.current = { x: event.clientX, y: event.clientY };
      lastPointRef.current = { x: event.clientX, y: event.clientY };

      if (dragThreshold <= 0) {
        phaseRef.current = "dragging";
        setIsDragging(true);
        onGestureStart?.();
      } else {
        phaseRef.current = "pending";
      }
      setTracking(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // best-effort capture
      }
    },
    [disabled, descriptor, value, onGestureStart, dragThreshold],
  );

  useEffect(() => {
    if (!tracking) return;

    const onMove = (event: PointerEvent) => handlePointerMove(event);
    const onUp = () => endGesture(false);
    const onCancel = () => endGesture(true);
    // While a gesture is live, a right-click is part of the chord, not a menu
    // request: suppress the context menu, matching hardware feel (#402).
    const onContextMenu = (event: Event) => event.preventDefault();
    const options: AddEventListenerOptions = { passive: false };

    window.addEventListener("pointermove", onMove, options);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [tracking, handlePointerMove, endGesture]);

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
        // Reset keys differ by presentation. Where a tap opens the editor (the
        // screen-bar value field), type-in is the primary gesture, so reset is
        // Delete/Backspace and Enter opens the editor. Otherwise (knobs and
        // faders, whose type-in is a deliberate double-click on the label),
        // the body is a button-like control: Enter and Space reset to default.
        case "Delete":
        case "Backspace":
          if (tapOpensEdit) {
            event.preventDefault();
            commitDiscrete(resetValue(descriptor));
          }
          break;
        case "Enter":
          event.preventDefault();
          if (tapOpensEdit) {
            if (descriptor.parse) beginEdit();
          } else {
            commitDiscrete(resetValue(descriptor));
          }
          break;
        case " ":
          if (!tapOpensEdit) {
            event.preventDefault();
            commitDiscrete(resetValue(descriptor));
          }
          break;
      }
    },
    [
      disabled,
      isEditing,
      descriptor,
      value,
      commitDiscrete,
      beginEdit,
      tapOpensEdit,
    ],
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
    "aria-valuemin": ariaMin,
    "aria-valuemax": ariaMax,
    "aria-valuenow": ariaNow,
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
export type { UseParamControlProps, UseParamControlResult, DragAxis };
