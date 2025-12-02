import { Pattern } from "@/features/sequencer/types/pattern";

/**
 * Migrates a pattern to the current version, ensuring all required fields exist.
 * This is the single source of truth for pattern migrations.
 *
 * Used by:
 * - Zustand store persistence (localStorage)
 * - Preset loading (stock presets, .dh files, shared URLs)
 * - Any other pattern deserialization
 */
export function migratePattern(pattern: Pattern): Pattern {
  return pattern.map((voice) => ({
    ...voice,
    variations: [
      migrateStepSequence(voice.variations[0]),
      migrateStepSequence(voice.variations[1]),
    ] as [(typeof voice.variations)[0], (typeof voice.variations)[1]],
  }));
}

/**
 * Migrates a single step sequence to ensure all required fields exist.
 */
function migrateStepSequence<T extends { timingNudge?: number }>(
  sequence: T,
): T {
  return {
    ...sequence,
    // Add timingNudge field if missing (pre-v1 patterns)
    timingNudge: sequence.timingNudge ?? 0,
  };
}

/**
 * Migrates any unknown pattern structure (e.g., from localStorage).
 * Safely handles malformed or partial data.
 */
export function migratePatternUnsafe(pattern: any): Pattern {
  if (!Array.isArray(pattern)) {
    throw new Error("Invalid pattern: expected array");
  }

  return pattern.map((voice: any) => {
    if (!voice || !Array.isArray(voice.variations)) {
      throw new Error("Invalid voice: missing variations");
    }

    return {
      ...voice,
      variations: [
        migrateStepSequenceUnsafe(voice.variations[0]),
        migrateStepSequenceUnsafe(voice.variations[1]),
      ],
    };
  }) as Pattern;
}

/**
 * Migrates a single step sequence from unknown structure.
 */
function migrateStepSequenceUnsafe(sequence: any) {
  if (!sequence) {
    throw new Error("Invalid step sequence: null or undefined");
  }

  return {
    ...sequence,
    timingNudge: sequence.timingNudge ?? 0,
  };
}
