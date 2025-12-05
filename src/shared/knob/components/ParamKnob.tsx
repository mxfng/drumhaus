import { KNOB_OUTER_TICK_COUNT_DEFAULT } from "../lib/constants";
import { ParamMapping } from "../types/types";
import { Knob, KnobSize } from "./KnobBase";

interface ParamKnobProps<TValue> {
  label: string;
  /** Mapping to convert between knob value (sometimes called "step") and domain value */
  mapping: ParamMapping<TValue>;
  /** Quantization size (e.g. 1, 5, 100/7) ... If you want 8 options then 100 / 7 */
  value: number;
  /** Callback function to update the knob value in state */
  onValueChange: (value: number) => void;
  /** Number of outer ticks to render - must be odd if halfway mark is desired */
  outerTickCount?: number;
  /** Size of the knob - `"default"` is 90px, `"lg"` is 180px */
  size?: KnobSize;
  /** Hide the rotating tick indicator and rely on context instead */
  showTickIndicator?: boolean;
}

/**
 * Utility component to wrap a ParamMapping with a Knob component.
 */
function ParamKnob<TValue>({
  label,
  mapping,
  value: knobValue,
  onValueChange: onKnobValueChange,
  outerTickCount = KNOB_OUTER_TICK_COUNT_DEFAULT,
  size = "default",
  showTickIndicator = true,
}: ParamKnobProps<TValue>) {
  const quantizationStep = 100 / mapping.knobValueCount;

  const domainValue = mapping.knobToDomain(knobValue);
  const activeLabelFmt = mapping.format(domainValue, knobValue);
  const activeLabel = `${activeLabelFmt.value} ${activeLabelFmt.append ? activeLabelFmt.append : ""}`;

  const handleKnobValueChange = (newKnobValue: number) => {
    const paramValue = mapping.knobToDomain(newKnobValue);
    const canonicalKnobValue = mapping.domainToKnob(paramValue, newKnobValue);
    onKnobValueChange(canonicalKnobValue);
  };

  return (
    <Knob
      value={knobValue}
      onValueChange={handleKnobValueChange}
      step={quantizationStep}
      label={label}
      activeLabel={activeLabel}
      defaultValue={mapping.defaultKnobValue}
      outerTickCount={outerTickCount}
      size={size}
      showTickIndicator={showTickIndicator}
    />
  );
}

export default ParamKnob;
