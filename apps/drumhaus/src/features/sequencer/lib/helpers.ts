import { createEmptyPattern } from "@/core/audio/engine/pattern-types";
import { clamp, quantize } from "@/shared/lib/utils";

/**
 * Clamps velocity to 0-1 range with 2 decimal precision for Tone.js.
 * Quantizes to 0.01 increments (100 distinct levels) for consistent
 * precision in the audio engine while allowing clean 0-100 display.
 *
 * @param velocity - Raw velocity value
 * @returns Clamped and quantized velocity between 0 and 1
 */
function clampVelocity(velocity: number): number {
  const quantized = quantize(velocity, 0.01);
  return clamp(quantized, 0, 1);
}

export { createEmptyPattern, clampVelocity };
