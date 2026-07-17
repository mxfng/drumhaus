/**
 * Canonical split-filter value.
 *
 * Per docs/data-representation.md (Principle P2), the split filter is stored
 * as `{ side, cutoffHz }` - the musical intent - rather than a UI position or
 * two raw node frequencies. This is one of the two principled musical
 * exceptions to "canonical equals engine-native".
 *
 * This type is the SHARED seam between two consumers:
 *   - the knob primitive maps a normalized position to and from this value
 *     inside the filter descriptor's custom taper, and
 *   - the engine (fx/split-filter.ts, master-bus.ts) consumes this same type
 *     directly, deriving Tone-native node frequencies from side + cutoffHz.
 *
 * Keep both consumers pointed at THIS definition so the widget and the engine
 * cannot drift.
 */

type FilterSide = "lowpass" | "highpass";

interface CanonicalFilter {
  side: FilterSide;
  cutoffHz: number;
}

export type { FilterSide, CanonicalFilter };
