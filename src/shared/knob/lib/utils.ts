import { clamp } from "@/shared/lib/utils";
import { KNOB_EXPONENTIAL_CURVE_POWER } from "./constants";

/**
 * Convert normalized value [0, 1] to knob value [0, 100], preserving precision.
 * Keep fractional values so callers can decide how to quantize.
 */
export function toKnobValue(normalized: number): number {
  return clamp(normalized * 100, 0, 100);
}

/**
 * Apply exponential curve transformation for perceptually uniform knob response.
 * Used in forward transforms to map linear knob movement to exponential parameter change.
 */
export function applyExpCurve(t: number): number {
  return Math.pow(t, KNOB_EXPONENTIAL_CURVE_POWER);
}

/**
 * Apply inverse exponential curve transformation.
 * Used in inverse transforms to convert exponential parameter values back to linear knob positions.
 */
export function inverseExpCurve(t: number): number {
  return Math.pow(t, 1 / KNOB_EXPONENTIAL_CURVE_POWER);
}

/**
 * Convert semitone offset to frequency ratio.
 * Uses equal temperament tuning where each semitone is 2^(1/12) ratio.
 *
 * @example
 * semitonesToRatio(12)  // 2.0 (one octave up)
 * semitonesToRatio(-12) // 0.5 (one octave down)
 * semitonesToRatio(7)   // 1.498 (perfect fifth)
 */
export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/**
 * Convert frequency ratio to semitone offset.
 * Inverse of semitonesToRatio.
 *
 * @example
 * ratioToSemitones(2.0)  // 12 (one octave)
 * ratioToSemitones(0.5)  // -12 (one octave down)
 * ratioToSemitones(1.5)  // ~7 (perfect fifth)
 */
export function ratioToSemitones(ratio: number): number {
  return Math.log2(ratio) * 12;
}
