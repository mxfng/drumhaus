/**
 * The split-filter descriptor: the exemplar NON-number `ParamDescriptor`.
 *
 * Canonical value is `{ side, cutoffHz }` (docs/data-representation.md P2),
 * defined in the shared seam `@/core/audio/canonical/filter` so the engine
 * epic (PR B) consumes the SAME type. Position maps to and from the canonical
 * value through a `custom` taper - the escape hatch for curves that are not a
 * single exponent.
 *
 * Geometry: knob-centre (0.5) is the open extreme of each side (no filtering);
 * left of centre closes a low-pass down, right of centre opens a high-pass up.
 * There is no explicit bypass state - the centre IS the open extreme.
 *
 * Not wired into the engine or a store here; the model is unit-tested only.
 */

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import type { ParamDescriptor } from "../types";

/** Audible sweep bounds for the split filter, in Hz. */
const FILTER_MIN_HZ = 20;
const FILTER_MAX_HZ = 15000;

const LOG_SPAN = Math.log(FILTER_MAX_HZ / FILTER_MIN_HZ);

/** Position [0,1] -> `{ side, cutoffHz }`. Centre (0.5) = fully open. */
function positionToFilter(position: number): CanonicalFilter {
  if (position <= 0.5) {
    // Low-pass side: open (max) at centre, closing toward min at position 0.
    const t = (0.5 - position) / 0.5; // 0 at centre -> 1 at far left
    const cutoffHz = FILTER_MAX_HZ * Math.exp(-t * LOG_SPAN);
    return { side: "lowpass", cutoffHz };
  }
  // High-pass side: open (min) at centre, closing toward max at position 1.
  const t = (position - 0.5) / 0.5; // 0 at centre -> 1 at far right
  const cutoffHz = FILTER_MIN_HZ * Math.exp(t * LOG_SPAN);
  return { side: "highpass", cutoffHz };
}

/** `{ side, cutoffHz }` -> position [0,1]. Inverse of `positionToFilter`. */
function filterToPosition({ side, cutoffHz }: CanonicalFilter): number {
  const clamped = Math.min(FILTER_MAX_HZ, Math.max(FILTER_MIN_HZ, cutoffHz));
  if (side === "lowpass") {
    const t = Math.log(FILTER_MAX_HZ / clamped) / LOG_SPAN; // 0 open -> 1 closed
    return 0.5 - 0.5 * t;
  }
  const t = Math.log(clamped / FILTER_MIN_HZ) / LOG_SPAN; // 0 open -> 1 closed
  return 0.5 + 0.5 * t;
}

function formatFrequency(cutoffHz: number): string {
  if (cutoffHz >= 1000) return `${(cutoffHz / 1000).toFixed(1)} kHz`;
  return `${Math.round(cutoffHz)} Hz`;
}

const splitFilterDescriptor: ParamDescriptor<CanonicalFilter> = {
  min: { side: "lowpass", cutoffHz: FILTER_MIN_HZ },
  max: { side: "highpass", cutoffHz: FILTER_MAX_HZ },
  taper: {
    kind: "custom",
    to01: filterToPosition,
    from01: positionToFilter,
  },
  // Factory/init/store spelling of "fully open" (renders at knob-centre 0.5, the
  // same open extreme as { lowpass, FILTER_MAX_HZ }). Matching the factory
  // spelling exactly means resetting a factory-fresh filter knob does not
  // rewrite the stored value and never dirties the preset.
  default: { side: "highpass", cutoffHz: 0 },
  polarity: "bipolar",
  detents: [
    { value: { side: "lowpass", cutoffHz: FILTER_MAX_HZ }, radiusPct: 0.04 },
  ],
  format: ({ side, cutoffHz }) =>
    `${side === "lowpass" ? "LP" : "HP"} ${formatFrequency(cutoffHz)}`,
};

export {
  FILTER_MIN_HZ,
  FILTER_MAX_HZ,
  positionToFilter,
  filterToPosition,
  splitFilterDescriptor,
};
