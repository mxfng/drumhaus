export type FormattedValue = { value: string; append?: string };

/**
 * Maps between knob values (0-100) and domain values (e.g., 1000 Hz, -12 dB).
 *
 * - knobValue: Always 0-100 (stored in presets, passed to audio engine)
 * - knobValueCount: Controls UI quantization only (e.g., 48 = snap to 100/48 increments)
 * - knobToDomain: Converts knobValue (0-100) → domain value
 * - domainToKnob: Converts domain value → knobValue (0-100)
 */
export type ParamMapping<TValue = number> = {
  /** Number of discrete positions the knob can snap to (for UI quantization only) */
  knobValueCount: number;
  /** Convert knob value (0-100) to domain value */
  knobToDomain: (knobValue: number) => TValue;
  /** Convert domain value back to knob value (0-100)
   * @param value - The domain value to convert
   * @param currentKnobValue - Optional hint about current position (for non-bijective mappings)
   */
  domainToKnob: (value: TValue, currentKnobValue?: number) => number;
  /** Format domain value for display */
  format: (value: TValue, knobValue: number) => FormattedValue;
  /** Default knob value (0-100) */
  defaultKnobValue: number;
};
