/**
 * Store-facing instrument data model.
 *
 * This is the shape held by the instruments store and serialized in kits.
 * Every continuous field is CANONICAL (docs/data-representation.md): the units
 * the app stores and the engine hears, never a 0-100 knob position. The bridge
 * passes these straight to the engine (semitone -> Hz for tune; the split
 * filter and everything else are already engine-native).
 */

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import type { InstrumentRole } from "@/core/audio/engine/instrument/types";
import { SampleData } from "@/features/kit/types/sample";
import { InlineMeta } from "@/features/preset/types/meta";

interface InstrumentParams {
  /** Envelope decay time, seconds. */
  decay: number;
  /** Canonical split filter `{ side, cutoffHz }`. */
  filter: CanonicalFilter;
  /** Level in dB; -Infinity is silence. */
  volume: number;
  /** Stereo pan, -1 (left) to 1 (right). */
  pan: number;
  /** Pitch offset in semitones. */
  tune: number;
  solo: boolean;
  mute: boolean;
}

interface InstrumentData {
  meta: InlineMeta; // id + display name of this pad
  role: InstrumentRole; // where it lives conceptually in the kit
  sample: SampleData;
  params: InstrumentParams;
}

export type { InstrumentData, InstrumentParams };
