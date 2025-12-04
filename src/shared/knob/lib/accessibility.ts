import { KNOB_VALUE_MAX, KNOB_VALUE_MIN } from "./constants";

interface UseKnobKeyboardOptions {
  value: number;
  stepSize: number;
  onValueChange: (newValue: number) => void;
  onReset: () => void;
  disabled: boolean;
}

/**
 * Creates a keyboard event handler for knob controls
 * Supports: Arrow keys, PageUp/Down, Home/End, Enter/Space
 */
export const createKnobKeyboardHandler = ({
  value,
  stepSize,
  onValueChange,
  onReset,
  disabled,
}: UseKnobKeyboardOptions) => {
  return (e: React.KeyboardEvent) => {
    if (disabled) return;

    const largeStep = stepSize * 10;
    let newValue = value;

    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        e.preventDefault();
        newValue = Math.min(KNOB_VALUE_MAX, value + stepSize);
        break;
      case "ArrowDown":
      case "ArrowLeft":
        e.preventDefault();
        newValue = Math.max(KNOB_VALUE_MIN, value - stepSize);
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
      case " ":
        e.preventDefault();
        onReset();
        return;
    }

    if (newValue !== value) {
      onValueChange(newValue);
    }
  };
};
