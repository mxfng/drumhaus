import type { TimingNudge } from "@/features/sequencer/types/pattern";

/**
 * Musical subdivision for each timing nudge unit.
 * At 120 BPM, 1/96 note ≈ 20.83ms
 * This scales naturally with BPM changes.
 */
const NUDGE_UNIT_FRACTION = 1 / 96; // of a beat

/**
 * Converts a timing nudge level to a beat offset.
 * Uses musical fractions (1/96 note increments) so it scales with BPM.
 *
 * @param nudge - Timing nudge level (-2 to +2)
 * @returns Beat offset (negative = early, positive = late)
 *
 * @example
 * // At 120 BPM (1 beat = 0.5s):
 * nudgeToBeatOffset(-2) // -1/48 beat ≈ -41.67ms (very early)
 * nudgeToBeatOffset(-1) // -1/96 beat ≈ -20.83ms (early)
 * nudgeToBeatOffset(0)  // 0 beats (on-grid)
 * nudgeToBeatOffset(1)  // +1/96 beat ≈ +20.83ms (late)
 * nudgeToBeatOffset(2)  // +1/48 beat ≈ +41.67ms (very late)
 */
export function nudgeToBeatOffset(nudge: TimingNudge): number {
  return nudge * NUDGE_UNIT_FRACTION;
}

/**
 * Clamps a nudge value to the valid range [-2, 2].
 */
export function clampNudge(value: number): TimingNudge {
  return Math.max(-2, Math.min(2, value)) as TimingNudge;
}

/**
 * Returns a human-readable label for a timing nudge level.
 */
export function nudgeLabel(nudge: TimingNudge): string {
  switch (nudge) {
    case -2:
      return "Very Early";
    case -1:
      return "Early";
    case 0:
      return "Center";
    case 1:
      return "Late";
    case 2:
      return "Very Late";
  }
}

/**
 * All possible timing nudge levels for UI iteration.
 */
export const TIMING_NUDGE_LEVELS: TimingNudge[] = [-2, -1, 0, 1, 2];
