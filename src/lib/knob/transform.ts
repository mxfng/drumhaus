import {
  INSTRUMENT_PITCH_BASE_FREQUENCY,
  INSTRUMENT_PITCH_SEMITONE_RANGE,
  MASTER_FILTER_RANGE,
} from "@/lib/audio/engine/constants";
import {
  KNOB_EXPONENTIAL_CURVE_POWER,
  KNOB_VALUE_MAX,
  KNOB_VALUE_MIN,
} from "./constants";

export const KNOB_ROTATION_THRESHOLD_L = 49;
export const KNOB_ROTATION_THRESHOLD_R = 50;

// ============================================================================
// FORWARD TRANSFORMS (knobValue 0-100 → domain value)
// ============================================================================

/**
 * Transform knob values (0-100) linearly to any parameter range [min, max]
 */
export const transformKnobValueLinear = (
  input: number,
  range: [number, number],
): number => {
  const [newRangeMin, newRangeMax] = range;
  const scalingFactor = (newRangeMax - newRangeMin) / KNOB_VALUE_MAX;
  return scalingFactor * input + newRangeMin;
};

/**
 * Transform knob values (0-100) exponentially to any parameter range [min, max]
 */
export const transformKnobValueExponential = (
  input: number,
  range: [number, number],
): number => {
  const inputMin = KNOB_VALUE_MIN;
  const inputMax = KNOB_VALUE_MAX;
  const [outputMin, outputMax] = range;

  const normalizedInput = (input - inputMin) / (inputMax - inputMin);
  const exponentialValue = Math.pow(
    normalizedInput,
    KNOB_EXPONENTIAL_CURVE_POWER,
  );
  const mappedValue = outputMin + exponentialValue * (outputMax - outputMin);

  return mappedValue;
};

/**
 * Transform knob value (0-100) to pitch frequency with semitone quantization.
 * Center (50) = base frequency, ±24 semitones range.
 */
export const transformKnobValuePitch = (
  knobValue: number,
  baseFrequency: number = INSTRUMENT_PITCH_BASE_FREQUENCY,
  semitoneRange: number = INSTRUMENT_PITCH_SEMITONE_RANGE,
): number => {
  const clampedValue = Math.min(100, Math.max(0, knobValue));
  const normalized = (clampedValue - 50) / 50; // -1..1 relative to center
  const semitoneOffset = normalized * semitoneRange;
  const ratio = Math.pow(2, semitoneOffset / 12);
  return baseFrequency * ratio;
};

/**
 * Transform knob values split between two ranges, for different behavior on the left and right sides.
 * Used for low pass and high pass filters on a single knob.
 * Left half (0-49) = Low-pass filter, Right half (50-100) = High-pass filter
 */
export const transformKnobValueSplitFilter = (
  input: number,
  rangeLow: [number, number] = MASTER_FILTER_RANGE,
  rangeHigh: [number, number] = MASTER_FILTER_RANGE,
): number => {
  const shouldUseLowRange = input <= KNOB_ROTATION_THRESHOLD_L;
  const [min, max] = shouldUseLowRange ? rangeLow : rangeHigh;

  const newInput =
    ((shouldUseLowRange ? input : input - KNOB_ROTATION_THRESHOLD_R) /
      KNOB_ROTATION_THRESHOLD_L) *
    KNOB_VALUE_MAX;

  return transformKnobValueExponential(newInput, [min, max]);
};

// ============================================================================
// INVERSE TRANSFORMS (domain value → knobValue 0-100)
// ============================================================================

/**
 * Inverse of transformKnobValue: converts domain value back to knob value (0-100)
 */
export const inverseTransformKnobValue = (
  value: number,
  range: [number, number],
): number => {
  const [min, max] = range;
  if (value <= min) return 0;
  if (value >= max) return 100;
  const t = (value - min) / (max - min);
  return Math.min(100, Math.max(0, Math.round(t * 100)));
};

/**
 * Inverse of transformKnobValueExponential: converts domain value back to knob value (0-100)
 */
export const inverseTransformKnobValueExponential = (
  value: number,
  range: [number, number],
): number => {
  const [min, max] = range;
  if (value <= min) return 0;
  if (value >= max) return 100;

  const normalized = (value - min) / (max - min);
  const t = Math.pow(normalized, 1 / KNOB_EXPONENTIAL_CURVE_POWER);
  return Math.min(100, Math.max(0, Math.round(t * 100)));
};

/**
 * Inverse of transformKnobValuePitch: converts frequency back to knob value (0-100)
 */
export const inverseTransformKnobValuePitch = (
  frequency: number,
  baseFrequency: number = INSTRUMENT_PITCH_BASE_FREQUENCY,
  semitoneRange: number = INSTRUMENT_PITCH_SEMITONE_RANGE,
): number => {
  const ratio = frequency / baseFrequency;
  const semitoneOffset = Math.log2(ratio) * 12;
  const clamped = Math.max(
    -semitoneRange,
    Math.min(semitoneRange, semitoneOffset),
  );
  const normalized = clamped / semitoneRange; // -1..1
  const knobValue = normalized * 50 + 50; // 0..100
  return Math.min(100, Math.max(0, Math.round(knobValue)));
};

/**
 * Inverse of transformKnobValueSplitFilter: converts frequency back to knob value (0-100)
 * @param freq - The frequency value
 * @param currentKnobValue - Optional hint to preserve LP/HP side (for non-bijective mapping)
 */
export const inverseTransformKnobValueSplitFilter = (
  freq: number,
  currentKnobValue?: number,
  range: [number, number] = MASTER_FILTER_RANGE,
): number => {
  const [min, max] = range; // Both ranges are the same

  // Clamp frequency to valid range
  const clampedFreq = Math.max(min, Math.min(max, freq));

  // Invert exponential mapping
  const normalized = (clampedFreq - min) / (max - min);
  const t = Math.pow(normalized, 1 / KNOB_EXPONENTIAL_CURVE_POWER);

  // Determine which side (LP or HP) to map to
  // If we have a hint, preserve the current side
  const useHPSide =
    currentKnobValue !== undefined &&
    currentKnobValue > KNOB_ROTATION_THRESHOLD_L;

  // Map t (0..1) to appropriate range
  const knobValue = useHPSide
    ? KNOB_ROTATION_THRESHOLD_R + t * KNOB_ROTATION_THRESHOLD_L // HP: 50-100
    : t * KNOB_ROTATION_THRESHOLD_L; // LP: 0-49

  return Math.min(100, Math.max(0, Math.round(knobValue)));
};
