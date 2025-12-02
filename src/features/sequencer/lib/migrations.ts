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
export function migratePatternUnsafe(pattern: unknown): Pattern {
  if (!Array.isArray(pattern)) {
    throw new Error("Invalid pattern: expected array");
  }

  return pattern.map((voice: unknown) => {
    if (!isValidVoice(voice)) {
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
 * Type guard to check if unknown value is a valid voice structure.
 */
function isValidVoice(
  voice: unknown,
): voice is { variations: unknown[] } & Record<string, unknown> {
  return (
    typeof voice === "object" &&
    voice !== null &&
    "variations" in voice &&
    Array.isArray((voice as { variations: unknown }).variations)
  );
}

/**
 * Migrates a single step sequence from unknown structure.
 */
function migrateStepSequenceUnsafe(sequence: unknown) {
  if (!sequence || typeof sequence !== "object") {
    throw new Error("Invalid step sequence: null or undefined");
  }

  return {
    ...sequence,
    timingNudge:
      "timingNudge" in sequence && typeof sequence.timingNudge === "number"
        ? sequence.timingNudge
        : 0,
  };
}
