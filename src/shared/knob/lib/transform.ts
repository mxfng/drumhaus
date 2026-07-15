import type { CanonicalFilter } from "@/core/audio/canonical/filter";
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

// --- Split-filter position curve (widget-owned) -----------------------------
//
// The 0-100 split position is a control encoding (docs/data-representation.md,
// Principle P4), so its curve lives here in the widget, not in the engine.
// Positions 0-49 sweep the low-pass side and 50-100 sweep the high-pass side;
// the active half is rescaled to 0-1 and shaped with an exponential curve for
// perceptually uniform sweeps. The engine consumes the canonical
// `{ side, cutoffHz }` this curve produces (see splitFilterPositionToFilter).

/** Position at or below which the low-pass side is active. */
const KNOB_ROTATION_THRESHOLD_L = 49;
/** Lowest high-pass-side position (the open extreme of the high-pass side). */
const KNOB_ROTATION_THRESHOLD_R = 50;
/** Exponent of the perceptual position -> frequency curve. */
const SPLIT_FILTER_CURVE_POWER = 2;

/** Whether a split-filter position selects the low-pass side. */
const isSplitFilterLowPassPosition = (position: number): boolean =>
  position <= KNOB_ROTATION_THRESHOLD_L;

/**
 * Converts a split-filter position (0-100) to the active side's cutoff
 * frequency. The active half of the position range is rescaled to 0-1 and
 * shaped with the exponential curve.
 */
const splitFilterPositionToFrequency = (
  position: number,
  rangeLow: [number, number] = MASTER_FILTER_RANGE,
  rangeHigh: [number, number] = MASTER_FILTER_RANGE,
): number => {
  const lowPass = isSplitFilterLowPassPosition(position);
  const [min, max] = lowPass ? rangeLow : rangeHigh;

  const sidePosition =
    ((lowPass ? position : position - KNOB_ROTATION_THRESHOLD_R) /
      KNOB_ROTATION_THRESHOLD_L) *
    100;

  const t = sidePosition / 100;
  return min + Math.pow(t, SPLIT_FILTER_CURVE_POWER) * (max - min);
};

/**
 * Converts a split-filter position (0-100) to the canonical filter value the
 * engine and preset document consume: the side the position selects and the
 * active side's cutoff frequency.
 */
const splitFilterPositionToFilter = (position: number): CanonicalFilter => ({
  side: isSplitFilterLowPassPosition(position) ? "lowpass" : "highpass",
  cutoffHz: splitFilterPositionToFrequency(position),
});

/**
 * Inverse of splitFilterPositionToFilter: a canonical filter value back to a
 * 0-100 position. The `side` disambiguates the two positions that share a
 * cutoff, so this is a lossless inverse of the forward curve (no side hint
 * needed). cutoffHz above the range maximum recovers the closed high-pass
 * extreme, so a round trip through position 100 lands back on 100.
 */
const splitFilterToPosition = (filter: CanonicalFilter): number => {
  const [min, max] = MASTER_FILTER_RANGE;
  const normalized = (Math.max(min, filter.cutoffHz) - min) / (max - min);
  const t = Math.pow(normalized, 1 / SPLIT_FILTER_CURVE_POWER);
  const position =
    filter.side === "highpass"
      ? KNOB_ROTATION_THRESHOLD_R + t * KNOB_ROTATION_THRESHOLD_L
      : t * KNOB_ROTATION_THRESHOLD_L;
  return clamp(position, 0, 100);
};

// ============================================================================
// FORWARD TRANSFORMS (knobValue 0-100 → domain value)
// ============================================================================

/**
 * Transform knob values (0-100) linearly to any parameter range [min, max]
 */
const transformKnobValueLinear = (
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
const transformKnobValueExponential = (
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
const transformKnobValueTune = (
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
 * Wraps the widget-owned split-filter curve above.
 */
const transformKnobValueSplitFilter = (
  input: number,
  rangeLow: [number, number] = MASTER_FILTER_RANGE,
  rangeHigh: [number, number] = MASTER_FILTER_RANGE,
): number => splitFilterPositionToFrequency(input, rangeLow, rangeHigh);

// ============================================================================
// INVERSE TRANSFORMS (domain value → knobValue 0-100)
// ============================================================================

/**
 * Inverse of transformKnobValue: converts domain value back to knob value (0-100)
 */
const inverseTransformKnobValue = (
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
const inverseTransformKnobValueExponential = (
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
const inverseTransformKnobValueTune = (
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
const inverseTransformKnobValueSplitFilter = (
  freq: number,
  currentKnobValue?: number,
  range: [number, number] = MASTER_FILTER_RANGE,
): number => {
  const [min, max] = range; // Both ranges are the same

  // Clamp frequency to valid range
  const clampedFreq = clamp(freq, min, max);

  // Invert the engine's split-filter position -> frequency curve
  const normalized = normalize(clampedFreq, min, max);
  const t = Math.pow(normalized, 1 / SPLIT_FILTER_CURVE_POWER);

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

export {
  KNOB_ROTATION_THRESHOLD_L,
  KNOB_ROTATION_THRESHOLD_R,
  SPLIT_FILTER_CURVE_POWER,
  transformKnobValueLinear,
  transformKnobValueExponential,
  transformKnobValueTune,
  transformKnobValueSplitFilter,
  splitFilterPositionToFilter,
  splitFilterToPosition,
  inverseTransformKnobValue,
  inverseTransformKnobValueExponential,
  inverseTransformKnobValueTune,
  inverseTransformKnobValueSplitFilter,
};
