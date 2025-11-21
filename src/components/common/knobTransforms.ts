import { MASTER_FILTER_RANGE } from "@/lib/audio/engine/constants";

// Knob Value Constants
const KNOB_MAX_VALUE = 100;
const KNOB_MIN_VALUE = 0;
const KNOB_EXPONENTIAL_CURVE_POWER = 2;

export const KNOB_ROTATION_THRESHOLD_L = 49;
export const KNOB_ROTATION_THRESHOLD_R = 50;

// Transform knob values (0-100) to any Tone.js parameter range [min, max]
export const transformKnobValue = (
  input: number,
  range: [number, number],
): number => {
  const [newRangeMin, newRangeMax] = range;
  const scalingFactor = (newRangeMax - newRangeMin) / KNOB_MAX_VALUE;
  return scalingFactor * input + newRangeMin;
};

export const transformKnobFilterValue = (
  input: number,
  rangeLow: [number, number] = MASTER_FILTER_RANGE,
  rangeHigh: [number, number] = MASTER_FILTER_RANGE,
): number => {
  const shouldUseLowRange = input <= KNOB_ROTATION_THRESHOLD_L;
  const [min, max] = shouldUseLowRange ? rangeLow : rangeHigh;
  const newInput =
    ((shouldUseLowRange ? input : input - KNOB_ROTATION_THRESHOLD_R) /
      KNOB_ROTATION_THRESHOLD_L) *
    KNOB_MAX_VALUE;
  return transformKnobValueExponential(newInput, [min, max]);
};

export const transformKnobValueExponential = (
  input: number,
  range: [number, number],
): number => {
  const inputMin = KNOB_MIN_VALUE;
  const inputMax = KNOB_MAX_VALUE;
  const [outputMin, outputMax] = range;

  const normalizedInput = (input - inputMin) / (inputMax - inputMin);
  const exponentialValue = Math.pow(
    normalizedInput,
    KNOB_EXPONENTIAL_CURVE_POWER,
  );
  const mappedValue = outputMin + exponentialValue * (outputMax - outputMin);

  return mappedValue;
};
