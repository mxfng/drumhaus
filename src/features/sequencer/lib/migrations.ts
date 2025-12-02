import { STEP_COUNT } from "@/core/audio/engine/constants";
import {
  Pattern,
  StepSequence,
  VariationMetadata,
} from "@/features/sequencer/types/pattern";

/**
 * Migrates a pattern to the current version, ensuring all required fields exist.
 * This is the single source of truth for pattern migrations.
 *
 * Handles migration from:
 * - Legacy Pattern = Voice[] format (pre-variationMetadata)
 * - Current Pattern = { voices, variationMetadata } format
 *
 * Used by:
 * - Zustand store persistence (localStorage)
 * - Preset loading (stock presets, .dh files, shared URLs)
 * - Any other pattern deserialization
 */
export function migratePattern(pattern: Pattern | unknown): Pattern {
  // Check if this is the old Pattern = Voice[] format (legacy)
  if (Array.isArray(pattern)) {
    // Legacy format: Pattern was just Voice[]
    // Convert to new format with voices + variationMetadata
    return {
      voices: pattern.map((voice) => ({
        ...voice,
        variations: [
          migrateStepSequence(voice.variations[0]),
          migrateStepSequence(voice.variations[1]),
        ] as [(typeof voice.variations)[0], (typeof voice.variations)[1]],
      })),
      // Add default empty accent patterns for both variations
      variationMetadata: [
        { accent: Array.from({ length: STEP_COUNT }, () => false) },
        { accent: Array.from({ length: STEP_COUNT }, () => false) },
      ],
    };
  }

  // Modern format: { voices, variationMetadata }
  // Ensure all fields exist
  const modernPattern = pattern as Pattern;
  return {
    voices: modernPattern.voices.map((voice) => ({
      ...voice,
      variations: [
        migrateStepSequence(voice.variations[0]),
        migrateStepSequence(voice.variations[1]),
      ] as [(typeof voice.variations)[0], (typeof voice.variations)[1]],
    })),
    variationMetadata: [
      migrateVariationMetadata(modernPattern.variationMetadata?.[0]),
      migrateVariationMetadata(modernPattern.variationMetadata?.[1]),
    ],
  };
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
 * Migrates variation metadata to ensure all required fields exist.
 */
function migrateVariationMetadata(
  metadata: VariationMetadata | undefined,
): VariationMetadata {
  return {
    // Add accent field if missing (default to all false)
    accent: metadata?.accent ?? Array.from({ length: STEP_COUNT }, () => false),
  };
}

/**
 * Migrates any unknown pattern structure (e.g., from localStorage).
 * Safely handles malformed or partial data.
 *
 * Handles both legacy Voice[] format and modern { voices, variationMetadata } format.
 */
export function migratePatternUnsafe(pattern: unknown): Pattern {
  // Check if this is the old Pattern = Voice[] format
  if (Array.isArray(pattern)) {
    // Legacy format: Pattern was just Voice[]
    const voices = pattern.map((voice: unknown) => {
      if (!isValidVoice(voice)) {
        throw new Error("Invalid voice: missing variations");
      }

      const voiceObj = voice as {
        instrumentIndex: number;
        variations: unknown[];
      };

      return {
        instrumentIndex: voiceObj.instrumentIndex,
        variations: [
          migrateStepSequenceUnsafe(voiceObj.variations[0]),
          migrateStepSequenceUnsafe(voiceObj.variations[1]),
        ] as [StepSequence, StepSequence],
      };
    });

    return {
      voices,
      variationMetadata: [
        { accent: Array.from({ length: STEP_COUNT }, () => false) },
        { accent: Array.from({ length: STEP_COUNT }, () => false) },
      ],
    };
  }

  // Modern format: { voices, variationMetadata }
  if (!isValidPattern(pattern)) {
    throw new Error("Invalid pattern: expected { voices, variationMetadata }");
  }

  const voices = pattern.voices.map((voice: unknown) => {
    if (!isValidVoice(voice)) {
      throw new Error("Invalid voice: missing variations");
    }

    const voiceObj = voice as {
      instrumentIndex: number;
      variations: unknown[];
    };

    return {
      instrumentIndex: voiceObj.instrumentIndex,
      variations: [
        migrateStepSequenceUnsafe(voiceObj.variations[0]),
        migrateStepSequenceUnsafe(voiceObj.variations[1]),
      ] as [StepSequence, StepSequence],
    };
  });

  return {
    voices,
    variationMetadata: [
      migrateVariationMetadataUnsafe(pattern.variationMetadata?.[0]),
      migrateVariationMetadataUnsafe(pattern.variationMetadata?.[1]),
    ],
  };
}

/**
 * Type guard to check if unknown value is a valid modern pattern structure.
 */
function isValidPattern(
  pattern: unknown,
): pattern is { voices: unknown[]; variationMetadata?: unknown[] } {
  return (
    typeof pattern === "object" &&
    pattern !== null &&
    "voices" in pattern &&
    Array.isArray((pattern as { voices: unknown }).voices)
  );
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

/**
 * Migrates variation metadata from unknown structure.
 */
function migrateVariationMetadataUnsafe(metadata: unknown): VariationMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {
      accent: Array.from({ length: STEP_COUNT }, () => false),
    };
  }

  const accent =
    "accent" in metadata && Array.isArray(metadata.accent)
      ? metadata.accent
      : Array.from({ length: STEP_COUNT }, () => false);

  return { accent };
}
