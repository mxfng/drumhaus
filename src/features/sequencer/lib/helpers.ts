import { STEP_COUNT } from "@/lib/audio/engine/constants";
import { clamp, quantize } from "@/lib/utils";
import { Pattern, Voice } from "@/types/pattern";

/**
 * Creates an empty pattern with all triggers off and velocities at 1.0
 */
export function createEmptyPattern(): Pattern {
  const pattern: Pattern = [];

  for (let instrumentIndex = 0; instrumentIndex < 8; instrumentIndex++) {
    const voice: Voice = {
      instrumentIndex,
      variations: [
        {
          triggers: Array.from({ length: STEP_COUNT }, () => false),
          velocities: Array.from({ length: STEP_COUNT }, () => 1),
        },
        {
          triggers: Array.from({ length: STEP_COUNT }, () => false),
          velocities: Array.from({ length: STEP_COUNT }, () => 1),
        },
      ],
    };
    pattern.push(voice);
  }

  return pattern;
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
