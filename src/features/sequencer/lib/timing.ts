import type { TimingNudge } from "@/features/sequencer/types/pattern";

/**
 * Clamps a nudge value to the valid range [-2, 2].
 */
function clampNudge(value: number): TimingNudge {
  return Math.max(-2, Math.min(2, value)) as TimingNudge;
}

/**
 * Returns a human-readable label for a timing nudge level.
 */
function nudgeLabel(nudge: TimingNudge): string {
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
const TIMING_NUDGE_LEVELS: TimingNudge[] = [-2, -1, 0, 1, 2];

// nudgeToBeatOffset is owned by the audio engine
// (core/audio/engine/pattern-types.ts); re-exported here to preserve the
// historical feature-layer import path.
export { nudgeToBeatOffset } from "@/core/audio/engine/pattern-types";
export { clampNudge, nudgeLabel, TIMING_NUDGE_LEVELS };
