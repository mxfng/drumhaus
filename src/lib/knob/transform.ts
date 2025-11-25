import { MASTER_FILTER_RANGE } from "@/lib/audio/engine/constants";
import {
  KNOB_EXPONENTIAL_CURVE_POWER,
  KNOB_STEP_MAX,
  KNOB_STEP_MIN,
} from "./constants";

export const KNOB_ROTATION_THRESHOLD_L = 49;
export const KNOB_ROTATION_THRESHOLD_R = 50;

/**
 * Transform knob values (0-100) linearly to any Tone.js parameter range [min, max]
 */
export const transformKnobValue = (
  input: number,
  range: [number, number],
): number => {
  const [newRangeMin, newRangeMax] = range;

  const scalingFactor = (newRangeMax - newRangeMin) / KNOB_STEP_MAX;

  return scalingFactor * input + newRangeMin;
};

/**
 * Transform knob values (0-100) exponentially to any Tone.js parameter range [min, max]
 */
export const transformKnobValueExponential = (
  input: number,
  range: [number, number],
): number => {
  const inputMin = KNOB_STEP_MIN;
  const inputMax = KNOB_STEP_MAX;

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
 * Transform knob values split between two ranges, for different behavior on the left and right sides of the knob range.
 * Used for low pass and high pass filters on a single knob.
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
    KNOB_STEP_MAX;

  return transformKnobValueExponential(newInput, [min, max]);
};
