export type FormattedValue = { value: string; append?: string };

/**
 * Maps between knob values (0-100) and domain values (e.g., 1000 Hz, -12 dB).
 *
 * - step/knobValue: Always 0-100 (stored in presets, passed to audio engine)
 * - stepCount: Controls UI quantization only (e.g., 48 = snap to 100/48 increments)
 * - stepToValue: Converts knobValue (0-100) → domain value
 * - valueToStep: Converts domain value → knobValue (0-100)
 */
export type ParamMapping<TValue = number> = {
  /** Number of discrete positions the knob can snap to (for UI quantization only) */
  stepCount: number;
  /** Convert knob value (0-100) to domain value */
  stepToValue: (knobValue: number) => TValue;
  /** Convert domain value back to knob value (0-100) */
  valueToStep: (value: TValue) => number;
  /** Format domain value for display */
  format: (value: TValue, knobValue: number) => FormattedValue;
  /** Default knob value (0-100) */
  defaultStep: number;
};
