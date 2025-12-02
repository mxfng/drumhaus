import { useCallback, useEffect, useRef, useState } from "react";

import { clamp, quantize } from "@/shared/lib/utils";
import { Input } from "@/shared/ui";

interface ClickableValueProps {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  stepSize?: number;
  formatValue?: (value: number) => string;
  parseValue?: (text: string) => number;
  sensitivity?: number;
  className?: string;
  onEditingChange?: (isEditing: boolean) => void;
  label?: string;
  labelClassName?: string;
}

/**
 * A text display that becomes an input on click, and supports drag-to-change like a knob.
 * - Click once: enter edit mode with text input
 * - Press and drag: change value vertically with knob-like sensitivity
 */
export const ClickableValue: React.FC<ClickableValueProps> = ({
  value,
  onValueChange,
  min,
  max,
  stepSize = 1,
  formatValue = (v) => v.toString(),
  parseValue = (text) => parseFloat(text),
  sensitivity = 0.5,
  className = "",
  onEditingChange,
  label,
  labelClassName = "",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [inputValue, setInputValue] = useState(formatValue(value));
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update input value when prop changes (but not during edit)
  useEffect(() => {
    if (!isEditing && !isDragging) {
      setInputValue(formatValue(value));
    }
  }, [value, isEditing, isDragging, formatValue]);

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
      const newValue = clamp(dragStartValue + adjustedDeltaY, min, max);
      const quantized = quantize(newValue, stepSize);

      onValueChange(quantized);
    },
    [
      isDragging,
      dragStartY,
      dragStartValue,
      sensitivity,
      min,
      max,
      stepSize,
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
        setInputValue(value.toString());
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
    [isDragging, hasDragged, value, onEditingChange],
  );

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click handler since we handle everything in pointer events
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = () => {
    const parsed = parseValue(inputValue);
    if (!isNaN(parsed)) {
      const clamped = clamp(parsed, min, max);
      const quantized = quantize(clamped, stepSize);
      onValueChange(quantized);
      setInputValue(formatValue(quantized));
    } else {
      setInputValue(formatValue(value));
    }
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setInputValue(formatValue(value));
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

  return (
    <div
      ref={containerRef}
      className={className}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      style={{ cursor: isDragging ? "ns-resize" : "pointer" }}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          className="m-0 h-auto w-full min-w-0 rounded-none border-none bg-transparent p-0 text-center leading-none shadow-none ring-0 ring-offset-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ height: "auto", minHeight: "0", lineHeight: "inherit" }}
        />
      ) : (
        <>
          {label && <span className={labelClassName}>{label} </span>}
          <b className={label ? "pl-1" : ""}>{formatValue(value)}</b>
        </>
      )}
    </div>
  );
};
