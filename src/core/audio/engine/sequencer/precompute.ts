import { Pattern, Voice } from "@/features/sequencer/types/pattern";
import {
  ACCENT_BOOST,
  ACCENT_DAMPEN,
  STEP_COUNT,
  VARIATION_COUNT,
} from "../constants";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type PrecomputedHit = {
  voice: Voice;
  velocity: number;
};

export type PrecomputedPattern = {
  version: number;
  stepsByVariation: PrecomputedHit[][][]; // [variation][step][hits]
};

// -----------------------------------------------------------------------------
// Pattern Precomputation
// -----------------------------------------------------------------------------

/**
 * Precomputes pattern data for efficient playback.
 * Applies accent dampening and velocity calculations ahead of time.
 */
export function buildPrecomputedPattern(
  pattern: Pattern,
  version: number,
): PrecomputedPattern {
  const stepsByVariation: PrecomputedHit[][][] = Array.from(
    { length: VARIATION_COUNT },
    () => Array.from({ length: STEP_COUNT }, () => []),
  );

  // Check if each variation has any accents (used to determine if dampening is needed)
  const hasAccents = pattern.variationMetadata.map((meta) =>
    meta.accent.some((a) => a),
  );

  for (let voiceIndex = 0; voiceIndex < pattern.voices.length; voiceIndex++) {
    const voice = pattern.voices[voiceIndex];

    for (
      let variationIndex = 0;
      variationIndex < VARIATION_COUNT;
      variationIndex++
    ) {
      const variation = voice.variations[variationIndex];
      const accentPattern = pattern.variationMetadata[variationIndex].accent;
      const variationHasAccents = hasAccents[variationIndex];

      for (let step = 0; step < STEP_COUNT; step++) {
        if (!variation.triggers[step]) continue;

        const baseVelocity = variation.velocities[step];
        const isAccented = accentPattern[step];

        let velocity: number;
        if (variationHasAccents) {
          // Variation has accents: dampen all velocities, then boost accented ones
          // This creates relative dynamics even when all velocities are at 1.0
          const dampenedVelocity = baseVelocity / ACCENT_DAMPEN;
          velocity = isAccented
            ? Math.min(1.0, dampenedVelocity * ACCENT_BOOST)
            : dampenedVelocity;
        } else {
          // No accents in this variation: use velocity as-is
          velocity = baseVelocity;
        }

        stepsByVariation[variationIndex][step].push({
          voice,
          velocity,
        });
      }
    }
  }

  return {
    version,
    stepsByVariation,
  };
}
