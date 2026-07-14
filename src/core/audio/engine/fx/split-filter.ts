import { Filter } from "tone/build/esm/index";

import {
  MASTER_FILTER_RANGE,
  SPLIT_FILTER_BYPASS_FLOOR_HZ,
  SPLIT_FILTER_DEFAULT_RAMP_TIME,
} from "../constants";

/**
 * Split-filter position semantics.
 *
 * The 0-100 split position is a domain value owned by the engine: positions
 * 0-49 sweep the low-pass side, positions 50-100 sweep the high-pass side.
 * The UI knob mapping layer derives its display and inverse mapping from
 * these exports so the knob UI and the engine cannot drift.
 */
const SPLIT_FILTER_POSITION_THRESHOLD_L = 49;
const SPLIT_FILTER_POSITION_THRESHOLD_R = 50;

/** Exponent of the perceptual position -> frequency curve. */
const SPLIT_FILTER_CURVE_POWER = 2;

interface SplitFilterConfig {
  minFrequency: number;
  maxFrequency: number;
  rampTime?: number;
  bypassFloorHz?: number;
}

/**
 * Whether a split-filter position selects the low-pass side.
 */
function isSplitFilterLowPass(position: number): boolean {
  return position <= SPLIT_FILTER_POSITION_THRESHOLD_L;
}

/**
 * Converts a split-filter position (0-100) to a cutoff frequency.
 * The active half of the position range is rescaled to 0-1 and shaped with
 * an exponential curve for perceptually uniform sweeps.
 */
function splitFilterPositionToFrequency(
  position: number,
  rangeLow: [number, number] = MASTER_FILTER_RANGE,
  rangeHigh: [number, number] = MASTER_FILTER_RANGE,
): number {
  const lowPass = isSplitFilterLowPass(position);
  const [min, max] = lowPass ? rangeLow : rangeHigh;

  const sidePosition =
    ((lowPass ? position : position - SPLIT_FILTER_POSITION_THRESHOLD_R) /
      SPLIT_FILTER_POSITION_THRESHOLD_L) *
    100;

  const t = sidePosition / 100;
  return min + Math.pow(t, SPLIT_FILTER_CURVE_POWER) * (max - min);
}

/**
 * Applies split-filter behavior (LP on left, HP on right) to dedicated filter nodes
 * with a short ramp to avoid clicks when crossing the threshold.
 */
function applySplitFilterWithRamp(
  lowPassFilter: Filter,
  highPassFilter: Filter,
  position: number,
  config: SplitFilterConfig,
): void {
  const { minFrequency, maxFrequency, rampTime, bypassFloorHz } = config;

  const cutoff = splitFilterPositionToFrequency(position);
  const isLowPass = isSplitFilterLowPass(position);

  const lowPassTarget = isLowPass ? cutoff : maxFrequency;
  const highPassTarget = isLowPass
    ? Math.max(minFrequency, bypassFloorHz ?? SPLIT_FILTER_BYPASS_FLOOR_HZ)
    : cutoff;

  rampFilterFrequency(lowPassFilter, lowPassTarget, rampTime);
  rampFilterFrequency(highPassFilter, highPassTarget, rampTime);
}

function rampFilterFrequency(
  filterNode: Filter,
  target: number,
  rampTime: number = SPLIT_FILTER_DEFAULT_RAMP_TIME,
): void {
  const now = filterNode.context.currentTime;
  const current = filterNode.frequency.value;
  filterNode.frequency.cancelScheduledValues(now);
  filterNode.frequency.setValueAtTime(current, now);
  filterNode.frequency.linearRampToValueAtTime(target, now + rampTime);
}

export {
  applySplitFilterWithRamp,
  isSplitFilterLowPass,
  splitFilterPositionToFrequency,
  SPLIT_FILTER_CURVE_POWER,
  SPLIT_FILTER_POSITION_THRESHOLD_L,
  SPLIT_FILTER_POSITION_THRESHOLD_R,
};
