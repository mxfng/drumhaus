import type {
  Pattern,
  StepSequence,
  VariationMetadata,
  Voice,
} from "@/features/sequencer/types/pattern";
import { STEP_COUNT } from "../../../../core/audio/engine/constants";
import type {
  OptimizedPattern,
  OptimizedStepSequence,
  OptimizedVariationMetadata,
  OptimizedVoice,
} from "./types";

/**
 * Optimizes a pattern for URL sharing by using sparse velocity encoding
 * Only stores velocities that differ from the default value of 1.0
 */
export function optimizePattern(pattern: Pattern): OptimizedPattern {
  return {
    voices: pattern.voices.map(optimizeVoice),
    variationMetadata: [
      optimizeVariationMetadata(pattern.variationMetadata[0]),
      optimizeVariationMetadata(pattern.variationMetadata[1]),
    ],
  };
}

function optimizeVoice(voice: Voice): OptimizedVoice {
  return {
    instrumentIndex: voice.instrumentIndex,
    variations: [
      optimizeStepSequence(voice.variations[0]),
      optimizeStepSequence(voice.variations[1]),
    ],
  };
}

function optimizeStepSequence(
  stepSequence: StepSequence,
): OptimizedStepSequence {
  const sparseVelocities: { [stepIndex: string]: number } = {};

  // Only store velocities that are not 1.0 (default)
  stepSequence.velocities.forEach((velocity, index) => {
    if (velocity !== 1.0) {
      sparseVelocities[index.toString()] = velocity;
    }
  });

  const optimized: OptimizedStepSequence = {
    triggers: stepSequence.triggers,
    velocities: sparseVelocities,
  };

  // Only store timingNudge if non-zero (for optimization)
  if (stepSequence.timingNudge !== 0) {
    optimized.timingNudge = stepSequence.timingNudge;
  }

  return optimized;
}

/**
 * Optimizes variation metadata by only storing accent if any steps are accented
 */
function optimizeVariationMetadata(
  metadata: VariationMetadata,
): OptimizedVariationMetadata {
  // Only store accent array if any accents are enabled
  const hasAccents = metadata.accent.some((accented) => accented);

  return hasAccents ? { accent: metadata.accent } : {};
}

/**
 * Hydrates an optimized pattern back to full Pattern format
 * Fills missing velocities with default value of 1.0
 */
export function hydratePattern(optimizedPattern: OptimizedPattern): Pattern {
  return {
    voices: optimizedPattern.voices.map(hydrateVoice),
    variationMetadata: [
      hydrateVariationMetadata(optimizedPattern.variationMetadata[0]),
      hydrateVariationMetadata(optimizedPattern.variationMetadata[1]),
    ],
  };
}

function hydrateVoice(optimizedVoice: OptimizedVoice): Voice {
  return {
    instrumentIndex: optimizedVoice.instrumentIndex,
    variations: [
      hydrateStepSequence(optimizedVoice.variations[0]),
      hydrateStepSequence(optimizedVoice.variations[1]),
    ],
  };
}

function hydrateStepSequence(
  optimizedSequence: OptimizedStepSequence,
): StepSequence {
  // Create array of 16 velocities, all defaulting to 1.0
  const velocities = Array(STEP_COUNT).fill(1.0);

  // Apply sparse velocity overrides
  Object.entries(optimizedSequence.velocities).forEach(([index, value]) => {
    velocities[parseInt(index)] = value;
  });

  return {
    triggers: optimizedSequence.triggers,
    velocities,
    timingNudge: (optimizedSequence.timingNudge ?? 0) as -2 | -1 | 0 | 1 | 2,
  };
}

/**
 * Hydrates variation metadata, filling in defaults for missing accent data
 */
function hydrateVariationMetadata(
  optimizedMetadata: OptimizedVariationMetadata,
): VariationMetadata {
  return {
    accent: optimizedMetadata.accent ?? Array(STEP_COUNT).fill(false),
  };
}
