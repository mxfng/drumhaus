import { STEP_COUNT } from "@/core/audio/engine/constants";
import { Pattern, Voice } from "@/features/sequencer/types/pattern";
import { clamp, quantize } from "@/shared/lib/utils";

/**
 * Creates an empty pattern with all triggers off, velocities at 1.0, and no accents.
 * Returns the complete Pattern structure with 8 voices and variation metadata.
 */
export function createEmptyPattern(): Pattern {
  const voices: Voice[] = [];

  for (let instrumentIndex = 0; instrumentIndex < 8; instrumentIndex++) {
    const voice: Voice = {
      instrumentIndex,
      variations: [
        {
          triggers: Array.from({ length: STEP_COUNT }, () => false),
          velocities: Array.from({ length: STEP_COUNT }, () => 1),
          timingNudge: 0,
          ratchets: Array.from({ length: STEP_COUNT }, () => false),
          flams: Array.from({ length: STEP_COUNT }, () => false),
        },
        {
          triggers: Array.from({ length: STEP_COUNT }, () => false),
          velocities: Array.from({ length: STEP_COUNT }, () => 1),
          timingNudge: 0,
          ratchets: Array.from({ length: STEP_COUNT }, () => false),
          flams: Array.from({ length: STEP_COUNT }, () => false),
        },
      ],
    };
    voices.push(voice);
  }

  return {
    voices,
    variationMetadata: [
      { accent: Array.from({ length: STEP_COUNT }, () => false) },
      { accent: Array.from({ length: STEP_COUNT }, () => false) },
    ],
  };
}

/**
 * Clamps velocity to 0-1 range with 2 decimal precision for Tone.js.
 * Quantizes to 0.01 increments (100 distinct levels) for consistent
 * precision in the audio engine while allowing clean 0-100 display.
 *
 * @param velocity - Raw velocity value
 * @returns Clamped and quantized velocity between 0 and 1
 */
export function clampVelocity(velocity: number): number {
  const quantized = quantize(velocity, 0.01);
  return clamp(quantized, 0, 1);
}
