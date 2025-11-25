import { KNOB_OUTER_TICK_COUNT_DEFAULT } from "@/lib/knob/constants";
import { ParamMapping } from "@/lib/knob/types";
import { Knob, KnobSize } from "./KnobV2";

type ParamKnobProps<TValue> = {
  label: string;
  mapping: ParamMapping<TValue>;
  step: number; // 0..stepCount
  onStepChange: (step: number) => void;
  outerTickCount?: number;
  size?: KnobSize;
};

/**
 * Utility component to wrap a ParamMapping with a Knob component.
 *
 * Note: 'step' is a legacy name - it's actually the knob value (0-100).
 * stepCount only controls UI quantization (how many discrete positions).
 */
function ParamKnob<TValue>({
  label,
  mapping,
  step,
  onStepChange,
  outerTickCount = KNOB_OUTER_TICK_COUNT_DEFAULT,
  size = "default",
}: ParamKnobProps<TValue>) {
  // step is already 0-100, no conversion needed
  const knobValue = step;

  // Calculate quantization step for the knob
  // e.g., stepCount=48 → quantStep≈2.08 (knob snaps to 48 positions)
  const quantizationStep = 100 / mapping.stepCount;

  // defaultStep is already 0-100
  const defaultKnobValue = mapping.defaultStep;

  const value = mapping.stepToValue(knobValue);
  const activeLabelFmt = mapping.format(value, knobValue);
  const activeLabel = `${activeLabelFmt.value} ${activeLabelFmt.append ? activeLabelFmt.append : ""}`;

  // Quantize to ensure stored value maps to clean parameter values
  const handleKnobChange = (newKnobValue: number) => {
    // Convert to parameter value (may quantize, e.g., to whole semitones)
    const paramValue = mapping.stepToValue(newKnobValue);
    // Convert back to canonical knob value for this parameter
    const canonicalKnobValue = mapping.valueToStep(paramValue);
    // Store the canonical value to ensure consistency
    onStepChange(canonicalKnobValue);
  };

  return (
    <Knob
      value={knobValue}
      onValueChange={handleKnobChange}
      step={quantizationStep}
      label={label}
      activeLabel={activeLabel}
      defaultValue={defaultKnobValue}
      outerTickCount={outerTickCount}
      size={size}
    />
  );
}

export default ParamKnob;
