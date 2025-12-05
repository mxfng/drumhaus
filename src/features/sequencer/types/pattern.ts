/**
 * Timing nudge offset in micro-steps (units of 1/96 note).
 * Shifts all triggers for this variation earlier (negative) or later (positive).
 * -2 = very early, -1 = early, 0 = on-grid, +1 = late, +2 = very late
 */
export type TimingNudge = -2 | -1 | 0 | 1 | 2;

/**
 * Represents one instrument's step sequence over a single bar (16 steps).
 */
export type StepSequence = {
  /** 16 boolean flags indicating whether this step is active (hit) or inactive (rest).
   *  Each boolean corresponds to one 16th note in a 4/4 bar. */
  triggers: boolean[]; // length: 16

  /** 16 velocity values (0.0 to 1.0) controlling the volume/intensity of each step.
   *  A value of 1.0 = full velocity (hard hit), 0.5 = half velocity (soft hit). */
  velocities: number[]; // length: 16, range: [0..1]

  /** Timing nudge offset for this variation (in 1/96 note increments).
   *  Applies a consistent timing shift to all triggered steps in this sequence.
   *  Defaults to 0 (on-grid). */
  timingNudge: TimingNudge;

  /** 16 boolean flags indicating which steps have ratchet enabled.
   *  When enabled, adds an additional 1/32 note trigger after the main hit.
   *  Creates rapid-fire double-hit effect. */
  ratchets: boolean[]; // length: 16

  /** 16 boolean flags indicating which steps have flam enabled.
   *  When enabled, triggers a grace note before the main hit (TR-909 style).
   *  Creates classic "double stick" flam sound. */
  flams: boolean[]; // length: 16
};

/**
 * Represents one voice/lane in the drum sequencer, tied to a specific instrument.
 * Each voice has four variations (A-D), allowing for pattern alternation during playback.
 */
export type Voice = {
  /** Index (0–7) identifying which instrument in the kit this voice plays. */
  instrumentIndex: number; // range: [0..7]

  /** Four step sequences representing the A, B, C, and D variations of this voice. */
  variations: [StepSequence, StepSequence, StepSequence, StepSequence]; // [A, B, C, D]
};

/**
 * Metadata for a single pattern variation (A-D).
 * Contains variation-level data that applies to ALL instruments/voices for that variation.
 * This is separate from per-voice variation data (triggers, velocities, timingNudge).
 */
export type VariationMetadata = {
  /** 16 boolean flags indicating which steps are accented.
   *  When a step is accented, its velocity is boosted for emphasis (TR-909 style).
   *  Accents apply to ALL instruments on that step - this is variation-level, not per-voice.
   *  Example: If step 0 and step 4 are accented, any triggered instrument on those steps
   *  will play louder regardless of which voice triggered it. */
  accent: boolean[]; // length: 16
};

/**
 * Represents a complete drum pattern with 8 voices and variation-level metadata.
 *
 * IMPORTANT: This structure separates two kinds of variation data:
 * 1. PER-VOICE variation data: Each voice has its own A/B/C/D patterns (voice.variations)
 *    - Contains triggers, velocities, and timingNudge for that specific instrument
 *    - Example: Kick drum has different patterns in variation A vs B
 *
 * 2. VARIATION-LEVEL metadata: Applies to ALL voices in a given variation (pattern.variationMetadata)
 *    - Contains accent patterns that affect all instruments
 *    - Example: Accents on steps 0 and 8 boost ALL triggered instruments on those steps
 *
 * When the sequencer plays variation A, it uses:
 * - pattern.voices[0].variations[0] for kick drum's A pattern
 * - pattern.voices[1].variations[0] for snare drum's A pattern
 * - pattern.variationMetadata[0] for variation A's accent pattern (applies to all)
 */
export type Pattern = {
  /** 8 voices, one per instrument slot (0-7).
   *  Each voice contains per-instrument pattern data for A, B, C, and D variations. */
  voices: Voice[]; // length: 8

  /** Metadata for variations A-D that applies to ALL voices.
   *  Contains variation-level settings like accent patterns.
   *  Index 0 = variation A metadata, Index 1 = variation B metadata, etc. */
  variationMetadata: [
    VariationMetadata,
    VariationMetadata,
    VariationMetadata,
    VariationMetadata,
  ]; // [A, B, C, D]
};
