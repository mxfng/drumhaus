import { FormattedValue, ParamMapping } from "@/lib/knob/types";
import { Knob } from "./KnobV2";

type ParamKnobProps<TValue> = {
  label: string;
  mapping: ParamMapping<TValue>;
  step: number; // 0..stepCount
  onStepChange: (step: number) => void;
};

function ParamKnob<TValue>({
  label,
  mapping,
  step,
  onStepChange,
}: ParamKnobProps<TValue>) {
  // Calculate quantization step for the knob
  // e.g., stepCount=100 → quantStep=1, stepCount=7 → quantStep≈14.3
  const quantizationStep = 100 / mapping.stepCount;

  const value = mapping.stepToValue(step);
  const display =
    mapping.format.length === 2
      ? (mapping.format as (v: TValue, s: number) => FormattedValue)(
          value,
          step,
        )
      : (mapping.format as (v: TValue) => FormattedValue)(value);

  const labelText = display.append
    ? `${display.value} ${display.append}`
    : display.value;

  return (
    <Knob
      value={step}
      onValueChange={onStepChange}
      step={quantizationStep}
      label={label}
      activeLabel={labelText}
    />
  );
}

export default ParamKnob;
