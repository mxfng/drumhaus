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
 */
function ParamKnob<TValue>({
  label,
  mapping,
  step,
  onStepChange,
  outerTickCount = KNOB_OUTER_TICK_COUNT_DEFAULT,
  size = "default",
}: ParamKnobProps<TValue>) {
  // Convert step (0..stepCount) to knob value (0..100)
  const knobValue = (step / mapping.stepCount) * 100;

  // Calculate quantization step for the knob
  // e.g., stepCount=100 → quantStep=1, stepCount=49 → quantStep≈2.04
  const quantizationStep = 100 / mapping.stepCount;

  // Convert default step to knob value
  const defaultKnobValue = (mapping.defaultStep / mapping.stepCount) * 100;

  const value = mapping.stepToValue(step);
  const activeLabelFmt = mapping.format(value, step);
  const activeLabel = `${activeLabelFmt.value} ${activeLabelFmt.append ? activeLabelFmt.append : ""}`;

  // Convert knob value (0..100) back to step (0..stepCount)
  const handleKnobChange = (newKnobValue: number) => {
    const newStep = Math.round((newKnobValue / 100) * mapping.stepCount);
    onStepChange(newStep);
  };

  console.debug("ParamKnob", {
    label,
    mapping,
    step,
    onStepChange,
    outerTickCount,
    knobValue,
    quantizationStep,
  });

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
