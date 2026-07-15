/**
 * Instrument types owned by the audio engine.
 *
 * Only engine-facing types live here (roles and pushed param shapes in
 * domain units). The store-facing instrument data model
 * (InstrumentData / InstrumentParams, which reference kit and preset
 * metadata) lives in features/instrument/types/instrument.ts.
 */

import type { CanonicalFilter } from "@/core/audio/canonical/filter";

type InstrumentRole =
  | "kick"
  | "snare"
  | "clap"
  | "hat"
  | "ohat"
  | "tom"
  | "perc"
  | "crash"
  | "bass"
  | "synth"
  | "other";

/**
 * Continuous parameters that are applied directly to audio nodes.
 * These stay active and are updated via subscription.
 * All values are domain units, not knob values.
 */
interface ContinuousRuntimeParams {
  /** Canonical split filter `{ side, cutoffHz }`; the engine derives node frequencies (engine/fx/split-filter.ts). */
  filter: CanonicalFilter;
  /** Stereo pan position, -1 (left) to 1 (right) */
  pan: number;
  /** Level in dB (-Infinity = silence) */
  volume: number;
}

/**
 * Per-note parameters read by the scheduler on every trigger.
 * Pushed into the engine in domain units; retained per channel so live
 * knob tweaks during playback apply to the next trigger.
 */
interface ChannelPlayParams {
  /** Playback pitch (frequency, as produced by tuneMapping.knobToDomain) */
  pitch: number;
  /** Envelope decay time in seconds */
  decaySeconds: number;
  mute: boolean;
  solo: boolean;
}

export type { InstrumentRole, ContinuousRuntimeParams, ChannelPlayParams };
