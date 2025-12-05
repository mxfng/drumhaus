import {
  INSTRUMENT_TUNE_BASE_FREQUENCY,
  INSTRUMENT_TUNE_SEMITONE_RANGE,
  MASTER_FILTER_RANGE,
} from "@/core/audio/engine/constants";
import { clamp, lerp, normalize, normalizeCentered } from "@/shared/lib/utils";
import { KNOB_VALUE_MAX, KNOB_VALUE_MIN } from "./constants";
import {
  applyExpCurve,
  inverseExpCurve,
  ratioToSemitones,
  semitonesToRatio,
  toKnobValue,
} from "./utils";

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
  const [min, max] = range;
  const normalized = normalize(input, 0, KNOB_VALUE_MAX);
  return lerp(normalized, min, max);
};

/**
 * Transform knob values (0-100) exponentially to any parameter range [min, max]
 */
export const transformKnobValueExponential = (
  input: number,
  range: [number, number],
): number => {
  const [outputMin, outputMax] = range;
  const normalizedInput = normalize(input, KNOB_VALUE_MIN, KNOB_VALUE_MAX);
  const exponentialValue = applyExpCurve(normalizedInput);
  return lerp(exponentialValue, outputMin, outputMax);
};

/**
 * Transform knob value (0-100) to tune frequency with semitone quantization.
 * Center (50) = base frequency, ±24 semitones range.
 */
export const transformKnobValueTune = (
  knobValue: number,
  baseFrequency: number = INSTRUMENT_TUNE_BASE_FREQUENCY,
  semitoneRange: number = INSTRUMENT_TUNE_SEMITONE_RANGE,
): number => {
  const clampedValue = clamp(knobValue, 0, 100);
  const normalized = normalizeCentered(clampedValue, 50, 50); // -1..1 relative to center
  const semitoneOffset = normalized * semitoneRange;
  const ratio = semitonesToRatio(semitoneOffset);
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
  const normalized = normalize(value, min, max);
  return toKnobValue(normalized);
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

  const normalized = normalize(value, min, max);
  const t = inverseExpCurve(normalized);
  return toKnobValue(t);
};

/**
 * Inverse of transformKnobValueTune: converts frequency back to knob value (0-100)
 */
export const inverseTransformKnobValueTune = (
  frequency: number,
  baseFrequency: number = INSTRUMENT_TUNE_BASE_FREQUENCY,
  semitoneRange: number = INSTRUMENT_TUNE_SEMITONE_RANGE,
): number => {
  const ratio = frequency / baseFrequency;
  const semitoneOffset = ratioToSemitones(ratio);
  const clamped = clamp(semitoneOffset, -semitoneRange, semitoneRange);
  const normalized = normalizeCentered(clamped, 0, semitoneRange); // -1..1
  const knobValue = normalized * 50 + 50; // 0..100
  return clamp(Math.round(knobValue), 0, 100);
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
  const clampedFreq = clamp(freq, min, max);

  // Invert exponential mapping
  const normalized = normalize(clampedFreq, min, max);
  const t = inverseExpCurve(normalized);

  // Determine which side (LP or HP) to map to
  // If we have a hint, preserve the current side
  const useHPSide =
    currentKnobValue !== undefined &&
    currentKnobValue > KNOB_ROTATION_THRESHOLD_L;

  // Map t (0..1) to appropriate range
  const knobValue = useHPSide
    ? KNOB_ROTATION_THRESHOLD_R + t * KNOB_ROTATION_THRESHOLD_L // HP: 50-100
    : t * KNOB_ROTATION_THRESHOLD_L; // LP: 0-49

  return clamp(Math.round(knobValue), 0, 100);
};
