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
};

/**
 * Represents one voice/lane in the drum sequencer, tied to a specific instrument.
 * Each voice has two variations (A and B), allowing for pattern alternation during playback.
 */
export type Voice = {
  /** Index (0–7) identifying which instrument in the kit this voice plays. */
  instrumentIndex: number; // range: [0..7]

  /** Two step sequences representing the A and B variations of this voice. */
  variations: [StepSequence, StepSequence]; // [A variation, B variation]
};

/**
 * Represents a complete drum pattern consisting of 8 voices.
 */
export type Pattern = Voice[]; // length: 8 (one voice per instrument slot)
