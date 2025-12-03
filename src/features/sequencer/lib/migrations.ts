import {
  MASTER_COMP_DEFAULT_ATTACK,
  MASTER_FILTER_DEFAULT,
  MASTER_SATURATION_DEFAULT,
  STEP_COUNT,
} from "@/core/audio/engine/constants";
import { MasterChainParams } from "@/features/master-bus/types/master";
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
function migrateStepSequence<
  T extends {
    timingNudge?: number;
    ratchets?: boolean[];
    flams?: boolean[];
  },
>(sequence: T): T {
  return {
    ...sequence,
    // Add timingNudge field if missing (pre-v1 patterns)
    timingNudge: sequence.timingNudge ?? 0,
    // Add ratchets field if missing
    ratchets:
      sequence.ratchets ?? Array.from({ length: STEP_COUNT }, () => false),
    // Add flams field if missing
    flams: sequence.flams ?? Array.from({ length: STEP_COUNT }, () => false),
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

  const ratchets =
    "ratchets" in sequence && Array.isArray(sequence.ratchets)
      ? sequence.ratchets
      : Array.from({ length: STEP_COUNT }, () => false);

  const flams =
    "flams" in sequence && Array.isArray(sequence.flams)
      ? sequence.flams
      : Array.from({ length: STEP_COUNT }, () => false);

  return {
    ...sequence,
    timingNudge:
      "timingNudge" in sequence && typeof sequence.timingNudge === "number"
        ? sequence.timingNudge
        : 0,
    ratchets,
    flams,
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

/**
 * Migrates master chain params from legacy format to current format.
 * Handles conversion from separate lowPass/highPass to unified filter parameter.
 *
 * Legacy format: { lowPass, highPass, ... }
 * Current format: { filter, saturation, compAttack, ... }
 */
export function migrateMasterChainParams(
  params: MasterChainParams | unknown,
): MasterChainParams {
  const rawParams = params as Partial<MasterChainParams>;

  // If new format already exists, use it (with defaults for missing fields)
  if (rawParams.filter !== undefined) {
    return {
      filter: rawParams.filter ?? MASTER_FILTER_DEFAULT,
      saturation: rawParams.saturation ?? MASTER_SATURATION_DEFAULT,
      phaser: rawParams.phaser ?? 0,
      reverb: rawParams.reverb ?? 0,
      compThreshold: rawParams.compThreshold ?? 100,
      compRatio: rawParams.compRatio ?? 50,
      compAttack: rawParams.compAttack ?? MASTER_COMP_DEFAULT_ATTACK,
      compMix: rawParams.compMix ?? 70,
      masterVolume: rawParams.masterVolume ?? 92,
    };
  }

  // Legacy format: convert lowPass/highPass to unified filter
  // Strategy: if highPass > 0, use highpass mode; otherwise use lowpass mode
  const legacyLowPass = rawParams.lowPass ?? 100;
  const legacyHighPass = rawParams.highPass ?? 0;

  // Determine filter mode based on which filter was more "active"
  // If highPass was being used (not at minimum), prefer highpass mode
  const useHighPassMode = legacyHighPass > 0;
  const filter = useHighPassMode
    ? 50 + Math.round(legacyHighPass / 2) // Map 0-100 highPass to 50-100 filter
    : Math.round(legacyLowPass / 2); // Map 0-100 lowPass to 0-50 filter

  return {
    filter,
    saturation: MASTER_SATURATION_DEFAULT, // New parameter
    phaser: rawParams.phaser ?? 0,
    reverb: rawParams.reverb ?? 0,
    compThreshold: rawParams.compThreshold ?? 100,
    compRatio: rawParams.compRatio ?? 50,
    compAttack: rawParams.compAttack ?? MASTER_COMP_DEFAULT_ATTACK, // New parameter
    compMix: rawParams.compMix ?? 70,
    masterVolume: rawParams.masterVolume ?? 92,
  };
}
