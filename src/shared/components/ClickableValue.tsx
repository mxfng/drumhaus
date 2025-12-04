import { useCallback, useEffect, useRef, useState } from "react";

import { KNOB_VALUE_MAX, KNOB_VALUE_MIN } from "@/shared/knob/lib/constants";
import { ParamMapping } from "@/shared/knob/types/types";
import { clamp, cn, quantize } from "@/shared/lib/utils";
import { Input } from "@/shared/ui";

interface ClickableValueProps {
  value: number; // Knob value (0-100)
  onValueChange: (knobValue: number) => void;
  mapping: ParamMapping<number>;
  parseValue?: (text: string) => number;
  sensitivity?: number;
  className?: string;
  onEditingChange?: (isEditing: boolean) => void;
  label?: string;
  labelClassName?: string;
}

const defaultParse = (text: string) => parseFloat(text);

/**
 * A text display that becomes an input on click, and supports drag-to-change like a knob.
 * - Click once: enter edit mode with text input
 * - Press and drag: change value vertically with knob-like sensitivity
 */
export const ClickableValue: React.FC<ClickableValueProps> = ({
  value,
  onValueChange,
  mapping,
  parseValue = defaultParse,
  sensitivity = 0.5,
  className = "",
  onEditingChange,
  label,
  labelClassName = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [inputValue, setInputValue] = useState(
    () => mapping.format(mapping.knobToDomain(value), value).value,
  );
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const knobStepSize =
    mapping.knobValueCount > 0 ? 100 / mapping.knobValueCount : 1;

  const quantizeKnobValue = useCallback(
    (knobValue: number) => {
      const clamped = clamp(knobValue, KNOB_VALUE_MIN, KNOB_VALUE_MAX);
      const snapped = quantize(clamped, knobStepSize);
      const domainValue = mapping.knobToDomain(snapped);
      return clamp(
        mapping.domainToKnob(domainValue, snapped),
        KNOB_VALUE_MIN,
        KNOB_VALUE_MAX,
      );
    },
    [mapping, knobStepSize],
  );

  const formatDisplayValue = useCallback(
    (knobValue: number) => {
      const formatted = mapping.format(
        mapping.knobToDomain(knobValue),
        knobValue,
      );
      return {
        value: formatted.value,
        append: formatted.append,
      };
    },
    [mapping],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;

    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    setDragStartY(e.clientY);
    setDragStartValue(value);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      e.preventDefault();
      const deltaY = Math.abs(dragStartY - e.clientY);

      // Mark as dragged if moved more than 3 pixels
      if (deltaY > 3) {
        setHasDragged(true);
      }

      const adjustedDeltaY = (dragStartY - e.clientY) * sensitivity;
      const newValue = clamp(
        dragStartValue + adjustedDeltaY,
        KNOB_VALUE_MIN,
        KNOB_VALUE_MAX,
      );
      const quantized = quantizeKnobValue(newValue);

      onValueChange(quantized);
    },
    [
      isDragging,
      dragStartY,
      dragStartValue,
      quantizeKnobValue,
      sensitivity,
      onValueChange,
    ],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      setIsDragging(false);

      // Only trigger edit mode if we didn't drag
      if (!hasDragged) {
        setIsEditing(true);
        onEditingChange?.(true);
        const formatted = formatDisplayValue(value);
        setInputValue(formatted.value);
        setTimeout(() => inputRef.current?.select(), 0);
      }

      if (e.target instanceof HTMLElement) {
        try {
          e.target.releasePointerCapture(e.pointerId);
        } catch {
          // Ignore
        }
      }
    },
    [formatDisplayValue, isDragging, hasDragged, value, onEditingChange],
  );

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click handler since we handle everything in pointer events
    e.preventDefault();
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing) return; // Input handles its own keyboard events

      const largeStep = knobStepSize * 10;
      let newValue = value;

      switch (e.key) {
        case "ArrowUp":
        case "ArrowRight":
          e.preventDefault();
          newValue = Math.min(KNOB_VALUE_MAX, value + knobStepSize);
          break;
        case "ArrowDown":
        case "ArrowLeft":
          e.preventDefault();
          newValue = Math.max(KNOB_VALUE_MIN, value - knobStepSize);
          break;
        case "PageUp":
          e.preventDefault();
          newValue = Math.min(KNOB_VALUE_MAX, value + largeStep);
          break;
        case "PageDown":
          e.preventDefault();
          newValue = Math.max(KNOB_VALUE_MIN, value - largeStep);
          break;
        case "Home":
          e.preventDefault();
          newValue = KNOB_VALUE_MIN;
          break;
        case "End":
          e.preventDefault();
          newValue = KNOB_VALUE_MAX;
          break;
        case "Enter":
        case " ": {
          e.preventDefault();
          setIsEditing(true);
          onEditingChange?.(true);
          const formatted = formatDisplayValue(value);
          setInputValue(formatted.value);
          setTimeout(() => inputRef.current?.select(), 0);
          return;
        }
      }

      if (newValue !== value) {
        const quantized = quantizeKnobValue(newValue);
        onValueChange(quantized);
      }
    },
    [
      isEditing,
      value,
      knobStepSize,
      quantizeKnobValue,
      onValueChange,
      formatDisplayValue,
      onEditingChange,
    ],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    const parsed = parseValue(inputValue);
    if (!isNaN(parsed)) {
      const quantizedKnobValue = quantizeKnobValue(
        mapping.domainToKnob(parsed),
      );
      onValueChange(quantizedKnobValue);
      const formatted = formatDisplayValue(quantizedKnobValue);
      setInputValue(formatted.value);
    } else {
      const formatted = formatDisplayValue(value);
      setInputValue(formatted.value);
    }
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      const formatted = formatDisplayValue(value);
      setInputValue(formatted.value);
      setIsEditing(false);
      onEditingChange?.(false);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const opts: AddEventListenerOptions = { passive: false };
    window.addEventListener("pointermove", handlePointerMove, opts);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const formattedDisplay = formatDisplayValue(value);

  return (
    <div
      className={cn("focus-ring", className)}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isEditing ? -1 : 0}
      role="slider"
      aria-label={label || "Value"}
      aria-valuemin={KNOB_VALUE_MIN}
      aria-valuemax={KNOB_VALUE_MAX}
      aria-valuenow={value}
      style={{ cursor: isDragging ? "ns-resize" : "pointer" }}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleSubmit}
          onKeyDown={handleInputKeyDown}
          className="m-0 h-auto w-full min-w-0 rounded-none border-none bg-transparent p-0 text-center leading-none shadow-none ring-0 ring-offset-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ height: "auto", minHeight: "0", lineHeight: "inherit" }}
        />
      ) : (
        <>
          {label && <span className={labelClassName}>{label} </span>}
          <span className={label ? "pl-0.5" : ""}>
            {formattedDisplay.value}
          </span>
          {!label && formattedDisplay.append ? (
            <span className="pl-0.5">{formattedDisplay.append}</span>
          ) : null}
        </>
      )}
    </div>
  );
};
