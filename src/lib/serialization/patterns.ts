import type { Pattern, StepSequence, Voice } from "@/types/pattern";
import { STEP_COUNT } from "../audio/engine/constants";
import type {
  OptimizedPattern,
  OptimizedStepSequence,
  OptimizedVoice,
} from "./types";

/**
 * Optimizes a pattern for URL sharing by using sparse velocity encoding
 * Only stores velocities that differ from the default value of 1.0
 */
export function optimizePattern(pattern: Pattern): OptimizedPattern {
  return {
    voices: pattern.map(optimizeVoice),
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

  return {
    triggers: stepSequence.triggers,
    velocities: sparseVelocities,
  };
}

/**
 * Hydrates an optimized pattern back to full Pattern format
 * Fills missing velocities with default value of 1.0
 */
export function hydratePattern(optimizedPattern: OptimizedPattern): Pattern {
  return optimizedPattern.voices.map(hydrateVoice);
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
  };
}
