import {
  MASTER_COMP_DEFAULT_ATTACK,
  MASTER_FILTER_DEFAULT,
  MASTER_SATURATION_DEFAULT,
  STEP_COUNT,
} from "@/core/audio/engine/constants";
import { MasterChainParams } from "@/core/audio/engine/fx/masterChain/types";
import { InstrumentData } from "@/core/audio/engine/instrument/types";
import { clampNudge } from "@/features/sequencer/lib/timing";
import {
  Pattern,
  StepSequence,
  VariationMetadata,
} from "@/features/sequencer/types/pattern";

const EMPTY_SEQUENCE: StepSequence = {
  triggers: Array.from({ length: STEP_COUNT }, () => false),
  velocities: Array.from({ length: STEP_COUNT }, () => 1),
  timingNudge: 0,
  ratchets: Array.from({ length: STEP_COUNT }, () => false),
  flams: Array.from({ length: STEP_COUNT }, () => false),
};

const EMPTY_VARIATION_METADATA: VariationMetadata = {
  accent: Array.from({ length: STEP_COUNT }, () => false),
};

function normalizeVariations(
  variations: StepSequence[],
): [StepSequence, StepSequence, StepSequence, StepSequence] {
  return [
    migrateStepSequence(variations?.[0] ?? EMPTY_SEQUENCE),
    migrateStepSequence(variations?.[1] ?? EMPTY_SEQUENCE),
    migrateStepSequence(variations?.[2] ?? EMPTY_SEQUENCE),
    migrateStepSequence(variations?.[3] ?? EMPTY_SEQUENCE),
  ];
}

function normalizeVariationMetadata(
  metadata: VariationMetadata[] | undefined,
): [
  VariationMetadata,
  VariationMetadata,
  VariationMetadata,
  VariationMetadata,
] {
  return [
    migrateVariationMetadata(metadata?.[0] ?? EMPTY_VARIATION_METADATA),
    migrateVariationMetadata(metadata?.[1] ?? EMPTY_VARIATION_METADATA),
    migrateVariationMetadata(metadata?.[2] ?? EMPTY_VARIATION_METADATA),
    migrateVariationMetadata(metadata?.[3] ?? EMPTY_VARIATION_METADATA),
  ];
}

function normalizeVariationsUnsafe(
  variations: unknown[],
): [StepSequence, StepSequence, StepSequence, StepSequence] {
  return [
    migrateStepSequenceUnsafe(variations?.[0]),
    migrateStepSequenceUnsafe(variations?.[1]),
    migrateStepSequenceUnsafe(variations?.[2]),
    migrateStepSequenceUnsafe(variations?.[3]),
  ];
}

function normalizeVariationMetadataUnsafe(
  metadata: unknown[] | undefined,
): [
  VariationMetadata,
  VariationMetadata,
  VariationMetadata,
  VariationMetadata,
] {
  return [
    migrateVariationMetadataUnsafe(metadata?.[0]),
    migrateVariationMetadataUnsafe(metadata?.[1]),
    migrateVariationMetadataUnsafe(metadata?.[2]),
    migrateVariationMetadataUnsafe(metadata?.[3]),
  ];
}

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
        variations: normalizeVariations(voice.variations as StepSequence[]),
      })),
      // Add default empty accent patterns for both variations
      variationMetadata: normalizeVariationMetadata(undefined),
    };
  }

  // Modern format: { voices, variationMetadata }
  // Ensure all fields exist
  const modernPattern = pattern as Pattern;
  return {
    voices: modernPattern.voices.map((voice) => ({
      ...voice,
      variations: normalizeVariations(voice.variations as StepSequence[]),
    })),
    variationMetadata: normalizeVariationMetadata(
      modernPattern.variationMetadata as VariationMetadata[],
    ),
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
        variations: normalizeVariationsUnsafe(voiceObj.variations),
      };
    });

    return {
      voices,
      variationMetadata: normalizeVariationMetadataUnsafe(undefined),
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
      variations: normalizeVariationsUnsafe(voiceObj.variations),
    };
  });

  return {
    voices,
    variationMetadata: normalizeVariationMetadataUnsafe(
      pattern.variationMetadata as VariationMetadata[],
    ),
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

  const triggers =
    "triggers" in sequence && Array.isArray(sequence.triggers)
      ? sequence.triggers
      : Array.from({ length: STEP_COUNT }, () => false);

  const velocities =
    "velocities" in sequence && Array.isArray(sequence.velocities)
      ? sequence.velocities
      : Array.from({ length: STEP_COUNT }, () => 1);

  const ratchets =
    "ratchets" in sequence && Array.isArray(sequence.ratchets)
      ? sequence.ratchets
      : Array.from({ length: STEP_COUNT }, () => false);

  const flams =
    "flams" in sequence && Array.isArray(sequence.flams)
      ? sequence.flams
      : Array.from({ length: STEP_COUNT }, () => false);

  const timingNudge =
    "timingNudge" in sequence && typeof sequence.timingNudge === "number"
      ? clampNudge(sequence.timingNudge)
      : 0;

  return {
    ...sequence,
    triggers,
    velocities,
    timingNudge,
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
 * Migrates instrument params from legacy format to current format.
 */
function migrateInstrumentParams(params: unknown): {
  decay: number;
  filter: number;
  volume: number;
  pan: number;
  tune: number;
  solo: boolean;
  mute: boolean;
} {
  if (!params || typeof params !== "object") {
    throw new Error("Invalid instrument params: expected object");
  }

  const rawParams = params as Record<string, unknown>;

  // Check if this is legacy format (has "release" or "pitch")
  const isLegacyFormat = "release" in rawParams || "pitch" in rawParams;

  if (isLegacyFormat) {
    // Legacy format: migrate parameter names
    return {
      decay: typeof rawParams.release === "number" ? rawParams.release : 50,
      filter: typeof rawParams.filter === "number" ? rawParams.filter : 50,
      volume: typeof rawParams.volume === "number" ? rawParams.volume : 92,
      pan: typeof rawParams.pan === "number" ? rawParams.pan : 50,
      tune: typeof rawParams.pitch === "number" ? rawParams.pitch : 50,
      solo: typeof rawParams.solo === "boolean" ? rawParams.solo : false,
      mute: typeof rawParams.mute === "boolean" ? rawParams.mute : false,
    };
  }

  // Modern format: return as-is (with type safety)
  return {
    decay: typeof rawParams.decay === "number" ? rawParams.decay : 50,
    filter: typeof rawParams.filter === "number" ? rawParams.filter : 50,
    volume: typeof rawParams.volume === "number" ? rawParams.volume : 92,
    pan: typeof rawParams.pan === "number" ? rawParams.pan : 50,
    tune: typeof rawParams.tune === "number" ? rawParams.tune : 50,
    solo: typeof rawParams.solo === "boolean" ? rawParams.solo : false,
    mute: typeof rawParams.mute === "boolean" ? rawParams.mute : false,
  };
}

/**
 * Migrates instrument params from legacy format to current format.
 *
 * Handles renaming of parameters:
 * - "release" → "decay"
 * - "pitch" → "tune"
 * - Removes obsolete "attack" parameter
 *
 * Legacy format: { attack, release, pitch, ... }
 * Current format: { decay, tune, ... }
 */
export function migrateInstruments(
  instruments: InstrumentData[],
): InstrumentData[] {
  return instruments.map((instrument) => ({
    ...instrument,
    params: migrateInstrumentParams(instrument.params),
  }));
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
