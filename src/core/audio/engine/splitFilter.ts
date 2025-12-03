import { Filter } from "tone/build/esm/index";

import { splitFilterMapping } from "@/shared/knob/lib/mapping";
import { KNOB_ROTATION_THRESHOLD_L } from "@/shared/knob/lib/transform";
import {
  SPLIT_FILTER_BYPASS_FLOOR_HZ,
  SPLIT_FILTER_DEFAULT_RAMP_TIME,
} from "./constants";

type SplitFilterConfig = {
  minFrequency: number;
  maxFrequency: number;
  rampTime?: number;
  bypassFloorHz?: number;
};

/**
 * Applies split-filter behavior (LP on left, HP on right) to dedicated filter nodes
 * with a short ramp to avoid clicks when crossing the threshold.
 */
export function applySplitFilterWithRamp(
  lowPassFilter: Filter,
  highPassFilter: Filter,
  knobValue: number,
  config: SplitFilterConfig,
): void {
  const { minFrequency, maxFrequency, rampTime, bypassFloorHz } = config;

  const cutoff = splitFilterMapping.knobToDomain(knobValue);
  const isLowPass = knobValue <= KNOB_ROTATION_THRESHOLD_L;

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
