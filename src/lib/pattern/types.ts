/**
 * Represents one instrument's step sequence over a single bar (16 steps).
 * Similar to a single instrument lane in a step sequencer, where each step can be
 * activated (triggered) with an optional velocity value.
 */
export type StepSequence = {
  /** 16 boolean flags indicating whether this step is active (hit) or inactive (rest).
   *  Each boolean corresponds to one 16th note in a 4/4 bar. */
  triggers: boolean[]; // length: 16

  /** 16 velocity values (0.0 to 1.0) controlling the volume/intensity of each step.
   *  Only meaningful where the corresponding triggers[i] === true.
   *  A value of 1.0 = full velocity (hard hit), 0.5 = half velocity (soft hit). */
  velocities: number[]; // length: 16, range: [0..1]
};

/**
 * Represents one voice/lane in the drum sequencer, tied to a specific instrument.
 * Similar to a single instrument track in a step sequencer (e.g., the Kick track or Snare track).
 * Each voice has two variations (A and B), allowing for pattern alternation during playback.
 */
export type Voice = {
  /** Index (0–7) identifying which instrument in the kit this voice plays.
   *  Typical assignment: 0=kick, 1=snare, 2=hi-hat, 3=open hat, 4=tom, etc. */
  instrumentIndex: number; // range: [0..7]

  /** Two step sequences representing the A and B variations of this voice.
   *  [0] = Variation A, [1] = Variation B
   *  This allows seamless switching between two pattern variations during playback. */
  variations: [StepSequence, StepSequence]; // [A variation, B variation]
};

/**
 * Represents a complete drum pattern consisting of 8 voices, one bar in length.
 * This is the fundamental data structure for storing and playing back drum patterns
 * in a step sequencer. Each pattern contains 8 parallel voices, each with
 * their own 16-step sequence and A/B variations.
 *
 * The pattern represents one bar (4 beats) at 16th note resolution, for a total
 * of 16 steps per voice. All voices play simultaneously, creating the full rhythm.
 */
export type Pattern = Voice[]; // length: 8 (one voice per instrument slot)

// TODO: Add serializer and deserializer for Pattern in separate files.

// TODO: Add any helper functions for Pattern, Voice, StepSequence in separate files.
