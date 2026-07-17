/**
 * Frozen split-filter position curve (legacy-read island).
 *
 * FROZEN-CURVE CONTRACT: this is the PERMANENT interpretation of a 0-100
 * split-filter position as a canonical `{ side, cutoffHz }` value. It
 * intentionally duplicates the widget's live curve as of the moment the filter
 * became canonical (that curve now lives in the param-control filter
 * descriptor, src/shared/param-control/descriptors/filter.ts; the canonical
 * flip retired the old src/shared/knob module). It must NEVER be re-pointed at
 * the live curve or edited to track it. The widget curve is UI-owned and may be
 * retuned; when it is, that retune is a pure control concern, and old positions
 * - both v1/v1.5 knob values (migrate-v1.ts) and v2 documents whose filter was
 * still a position (migrate-v2.ts) - must keep converting with the curve their
 * authors heard, which is exactly what this block preserves.
 *
 * A parity test (frozen-split-filter.test.ts) asserts frozen === live today;
 * on a deliberate retune, the TEST is updated to pin these frozen values,
 * never this file.
 */

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import { clamp } from "@/shared/lib/utils";

/** Cutoff range the position sweeps (Hz), frozen from MASTER_FILTER_RANGE. */
const FROZEN_SPLIT_FILTER_RANGE: [number, number] = [0, 15000];
/** Position at or below which the low-pass side is active. */
const FROZEN_SPLIT_FILTER_THRESHOLD_L = 49;
/** Lowest high-pass-side position. */
const FROZEN_SPLIT_FILTER_THRESHOLD_R = 50;
/** Exponent of the perceptual position -> frequency curve. */
const FROZEN_SPLIT_FILTER_CURVE_POWER = 2;

/**
 * Converts a frozen 0-100 split-filter position to the canonical
 * `{ side, cutoffHz }` value. Positions 0-49 select the low-pass side and
 * 50-100 the high-pass side; the active half is rescaled to 0-1 and shaped
 * with the exponential curve.
 */
function frozenSplitFilterPositionToCanonical(
  position: number,
): CanonicalFilter {
  const p = clamp(position, 0, 100);
  const lowPass = p <= FROZEN_SPLIT_FILTER_THRESHOLD_L;
  const [min, max] = FROZEN_SPLIT_FILTER_RANGE;

  const sidePosition =
    ((lowPass ? p : p - FROZEN_SPLIT_FILTER_THRESHOLD_R) /
      FROZEN_SPLIT_FILTER_THRESHOLD_L) *
    100;

  const t = sidePosition / 100;
  const cutoffHz =
    min + Math.pow(t, FROZEN_SPLIT_FILTER_CURVE_POWER) * (max - min);

  return { side: lowPass ? "lowpass" : "highpass", cutoffHz };
}

/**
 * Highest cutoff the frozen curve can produce. Its closed-high-pass extreme
 * (position 100) overshoots the range max because the high-pass side
 * normalizes its 50..100 span by 49, so the curve reaches (50/49)^2 of the
 * range at the top (~15618.5 Hz, above the 15 kHz range max). Derived by
 * evaluating the frozen curve at its maximum position so it cannot drift from
 * the curve; the preset schema uses it as the honest cutoff ceiling.
 */
const SPLIT_FILTER_MAX_CUTOFF_HZ =
  frozenSplitFilterPositionToCanonical(100).cutoffHz;

export {
  FROZEN_SPLIT_FILTER_RANGE,
  frozenSplitFilterPositionToCanonical,
  SPLIT_FILTER_MAX_CUTOFF_HZ,
};
