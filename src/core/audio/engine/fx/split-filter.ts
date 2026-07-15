import { Filter } from "tone/build/esm/index";

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import {
  SPLIT_FILTER_BYPASS_FLOOR_HZ,
  SPLIT_FILTER_DEFAULT_Q,
  SPLIT_FILTER_DEFAULT_RAMP_TIME,
} from "../constants";

/**
 * Split-filter engine path (Tone-native).
 *
 * The split filter is a canonical `{ side, cutoffHz }` value
 * (docs/data-representation.md, Principle P2): the engine consumes DERIVED
 * node frequencies and holds no UI encoding. The 0-100 position curve is a
 * widget concern and lives in src/shared/knob/lib/transform.ts.
 *
 * Two dedicated Tone `Filter` nodes (a low-pass and a high-pass in series)
 * implement the single-knob split so switching sides never re-types a live
 * node. Whichever side is inactive is opened out of the way: on the low-pass
 * side the high-pass drops to the bypass floor, on the high-pass side the
 * low-pass opens to the range maximum.
 */

interface SplitFilterConfig {
  /** Lowest cutoff the range spans (Hz); the low-pass bypass floor is at least this. */
  minFrequency: number;
  /** Highest cutoff the range spans (Hz); the low-pass opens here on the high-pass side. */
  maxFrequency: number;
  rampTime?: number;
  bypassFloorHz?: number;
}

/** The two node cutoff targets derived from a canonical filter value. */
interface SplitFilterFrequencies {
  lowPassTarget: number;
  highPassTarget: number;
}

/**
 * Resonance Q applied to both split-filter nodes. Not exposed to the user,
 * not canonical, and not persisted: the nodes are BUILT to accommodate a
 * real Tone filter Q (docs/data-representation.md, Approved decisions), and
 * this default equals Tone's own `Filter` default (1) so the sound is
 * byte-identical to before Q was wired in.
 */
const splitFilterResonanceQ = SPLIT_FILTER_DEFAULT_Q;

/**
 * Creates one split-filter node with the resonance Q wired in. Shared by the
 * instrument channel and the master bus so both build the filter identically.
 */
function createSplitFilterNode(
  frequency: number,
  type: "lowpass" | "highpass",
): Filter {
  return new Filter({ frequency, type, Q: splitFilterResonanceQ });
}

/**
 * Derives the low-pass and high-pass node cutoffs from a canonical filter
 * value. On the low-pass side the low-pass tracks the cutoff and the
 * high-pass opens to the bypass floor; on the high-pass side the high-pass
 * tracks the cutoff and the low-pass opens to the range maximum.
 */
function deriveSplitFilterFrequencies(
  filter: CanonicalFilter,
  config: SplitFilterConfig,
): SplitFilterFrequencies {
  const { minFrequency, maxFrequency, bypassFloorHz } = config;

  if (filter.side === "lowpass") {
    return {
      lowPassTarget: filter.cutoffHz,
      highPassTarget: Math.max(
        minFrequency,
        bypassFloorHz ?? SPLIT_FILTER_BYPASS_FLOOR_HZ,
      ),
    };
  }

  return {
    lowPassTarget: maxFrequency,
    highPassTarget: filter.cutoffHz,
  };
}

/**
 * Applies a canonical split-filter value to dedicated LP/HP nodes with a
 * short ramp to avoid clicks when crossing between sides.
 */
function applySplitFilterWithRamp(
  lowPassFilter: Filter,
  highPassFilter: Filter,
  filter: CanonicalFilter,
  config: SplitFilterConfig,
): void {
  const { lowPassTarget, highPassTarget } = deriveSplitFilterFrequencies(
    filter,
    config,
  );

  rampFilterFrequency(lowPassFilter, lowPassTarget, config.rampTime);
  rampFilterFrequency(highPassFilter, highPassTarget, config.rampTime);
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
  createSplitFilterNode,
  deriveSplitFilterFrequencies,
};
export type { SplitFilterConfig, SplitFilterFrequencies };
