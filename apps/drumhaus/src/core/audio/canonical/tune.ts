/**
 * Canonical tune conversions.
 *
 * Pitch is stored as a semitone offset (docs/data-representation.md, Principle
 * P2): Hz would bake in the sample's base pitch, so the musical offset is the
 * stable canonical form. The bridge derives the playback frequency the engine
 * hears from this offset via `semitonesToHz`.
 */

import { INSTRUMENT_TUNE_BASE_FREQUENCY } from "@/core/audio/engine/constants";

/** Convert a semitone offset to a frequency ratio (equal temperament). */
function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

/** Convert a frequency ratio to a semitone offset (inverse of semitonesToRatio). */
function ratioToSemitones(ratio: number): number {
  return Math.log2(ratio) * 12;
}

/**
 * Canonical semitone offset to the absolute playback frequency the engine
 * consumes, relative to the sampler's base pitch (C2).
 */
function semitonesToHz(
  semitones: number,
  baseFrequency: number = INSTRUMENT_TUNE_BASE_FREQUENCY,
): number {
  return baseFrequency * semitonesToRatio(semitones);
}

export { semitonesToRatio, ratioToSemitones, semitonesToHz };
