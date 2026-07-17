/**
 * Audio-coupled glow math for the night sky.
 *
 * The starfield's glow tracks the engine's ACTUAL master output level
 * (post-limiter dB RMS from getMasterLevelDb) like an audio visualizer,
 * breathing with the loudness of the mix. Pure functions so the curve is
 * unit-testable; the canvas rAF loop polls the level imperatively each
 * frame and never touches React state.
 *
 * The curve, visualizer-style:
 * 1. dB -> target: linear-in-dB normalization over [GLOW_DB_FLOOR, 0].
 *    Equal dB steps read as equal visual steps, which tracks loudness
 *    perception far better than linear amplitude. Silence (-Infinity, or
 *    anything at/below the floor) maps to 0; 0 dB and above map to 1.
 * 2. target -> level: exponential attack/release smoothing. Fast attack
 *    so hits register on their transient; slower release so the glow
 *    falls away musically instead of flickering per RMS window.
 * 3. Levels below GLOW_LEVEL_EPSILON with a silent target snap to exactly
 *    0, so idle rendering is bit-identical to the baseline look.
 */

/** Master levels at/below this dB read as silence (target 0). */
const GLOW_DB_FLOOR = -60;

/** Attack time constant: ~63% of the way to a louder target in this long. */
const GLOW_ATTACK_TAU_MS = 20;

/** Release time constant: ~63% of the way to a quieter target in this long. */
const GLOW_RELEASE_TAU_MS = 180;

/** Below this (with a silent target) the level snaps to exactly 0. */
const GLOW_LEVEL_EPSILON = 0.001;

/**
 * Cap on the smoothing time step, so a backgrounded tab (throttled rAF)
 * eases back in instead of jumping on return.
 */
const GLOW_MAX_FRAME_DELTA_MS = 100;

/**
 * Tuning constants for how strongly the glow reacts. Both are peak
 * fractional boosts at a 0 dB master level; typical playback sits well
 * below that, so the working range is a fraction of these. Tuned ambient:
 * the sky is a background visualizer and must never pull focus.
 */

/** Peak fractional glow-size boost. */
const GLOW_SIZE_GAIN = 0.2;

/** Peak fractional glow-opacity boost. */
const GLOW_BRIGHTNESS_GAIN = 0.1;

/**
 * Test-seam hysteresis for the data-star-glow attribute: "active" above
 * the high threshold, back to "silent" below the low one, so the seam
 * does not flap on the boundary.
 */
const GLOW_ACTIVE_THRESHOLD = 0.05;
const GLOW_SILENT_THRESHOLD = 0.02;

/**
 * Maps a master output level in dB (RMS, -Infinity for silence) to the
 * glow target in 0..1, linear in dB between GLOW_DB_FLOOR and 0.
 */
function glowTargetFromDb(db: number): number {
  if (Number.isNaN(db)) return 0;
  const normalized = (db - GLOW_DB_FLOOR) / -GLOW_DB_FLOOR;
  return Math.min(1, Math.max(0, normalized));
}

/**
 * One frame of visualizer smoothing: exponential approach to the target
 * with a fast attack and slower release. Frame-rate independent for a
 * held target (two 8ms steps land exactly where one 16ms step does);
 * deltaMs is clamped to [0, GLOW_MAX_FRAME_DELTA_MS].
 */
function smoothGlowLevel(
  previous: number,
  target: number,
  deltaMs: number,
): number {
  const clampedDelta = Math.min(Math.max(deltaMs, 0), GLOW_MAX_FRAME_DELTA_MS);
  const tau = target > previous ? GLOW_ATTACK_TAU_MS : GLOW_RELEASE_TAU_MS;
  const alpha = 1 - Math.exp(-clampedDelta / tau);
  const next = previous + (target - previous) * alpha;

  // Snap the tail to a true 0 so silence renders the exact baseline.
  if (next < GLOW_LEVEL_EPSILON && target < GLOW_LEVEL_EPSILON) return 0;
  return next;
}

export {
  GLOW_ACTIVE_THRESHOLD,
  GLOW_ATTACK_TAU_MS,
  GLOW_BRIGHTNESS_GAIN,
  GLOW_DB_FLOOR,
  GLOW_RELEASE_TAU_MS,
  GLOW_SILENT_THRESHOLD,
  GLOW_SIZE_GAIN,
  glowTargetFromDb,
  smoothGlowLevel,
};
