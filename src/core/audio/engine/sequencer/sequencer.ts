/**
 * Scheduling core shared by live playback and offline (WAV export) rendering.
 *
 * Everything here reads pushed engine state only - precomputed patterns,
 * per-channel play params in domain units, roles, and a snapshot bpm.
 * No stores, no knob values, and no live-transport reads: nudge and ratchet
 * beat offsets are converted to seconds with the bpm carried in the
 * scheduling context, so offline renders can never pick up the live
 * transport's tempo.
 *
 * createPatternSequence is the ONE scheduler both paths construct: the
 * AudioEngine builds the live sequence with fresh-state suppliers (so knob
 * tweaks and pattern edits apply mid-playback) and the offline renderer
 * builds it with fixed-snapshot suppliers plus a bar budget.
 */

import { Sequence } from "tone/build/esm/index";

import {
  FLAM_GRACE_VELOCITY,
  FLAM_OFFSET_SECONDS,
  RATCHET_OFFSET_BEATS,
  SEQUENCE_EVENTS,
  SEQUENCE_SUBDIVISION,
  STEP_COUNT,
} from "../constants";
import type { InstrumentChannel } from "../instrument-channel";
import type { ChannelPlayParams, InstrumentRole } from "../instrument/types";
import {
  clampVariationId,
  nudgeToBeatOffset,
  PatternChain,
  VariationId,
  Voice,
} from "../pattern-types";
import {
  advanceChainAtEndOfBar,
  ChainPlaybackState,
  getStepBoundaries,
  variationForBarStart,
} from "../variation/chain";
import type { PrecomputedHit, PrecomputedPattern } from "./precompute";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * Everything the scheduler needs to place one step's hits, in domain units.
 * Built per step from engine-owned pushed state (live) or once from a
 * snapshot (offline).
 */
interface ScheduleStepContext {
  channels: InstrumentChannel[];
  playParams: (ChannelPlayParams | undefined)[];
  roles: InstrumentRole[];
  /** Index of the open hat channel, or -1 when the kit has none. */
  ohatIndex: number;
  /** Whether any channel is soloed (soloing silences the others). */
  anySolos: boolean;
  /** Tempo used to convert nudge/ratchet beat offsets to seconds. */
  bpm: number;
}

/**
 * Parameters for the unified pattern sequence. The suppliers decide the
 * live/offline split: live playback passes closures over engine-owned
 * pushed state (read fresh on every step for responsiveness), offline
 * rendering passes closures over a fixed snapshot.
 */
interface PatternSequenceOptions {
  /** Chain to play. Must already be sanitized (sanitizeChain). */
  chain: PatternChain;
  chainEnabled: boolean;
  /** Supplies the per-step scheduling context (fresh play-param reads live). */
  getStepContext: () => ScheduleStepContext;
  /** Supplies the precomputed pattern; may return null before the first push. */
  getPrecomputedPattern: () => PrecomputedPattern | null;
  /** Supplies the latest pushed variation for non-chain playback. */
  getLatestVariation: () => VariationId;
  /**
   * Fired with the resolved variation at sequence creation and at every bar
   * start. Live playback mirrors this into the UI; offline passes nothing.
   */
  onVariationChange?: (variation: VariationId) => void;
  /**
   * Optional bar budget (offline only): scheduling stops after this many
   * bars and the sequence stops itself at the last budgeted step.
   */
  barBudget?: number;
}

// -----------------------------------------------------------------------------
// Unified pattern sequence
// -----------------------------------------------------------------------------

/**
 * Creates and starts the pattern sequence shared by live playback and
 * offline rendering: variation resolution at bar starts, hit scheduling per
 * step, and chain advance at bar ends. Returns the started sequence; the
 * caller owns starting the transport and disposing the sequence.
 */
function createPatternSequence(options: PatternSequenceOptions): Sequence {
  const {
    chain,
    chainEnabled,
    getStepContext,
    getPrecomputedPattern,
    getLatestVariation,
    onVariationChange,
    barBudget,
  } = options;

  // Chain playback state lives for exactly one sequence lifetime; live
  // playback recreates the sequence (restarting from the chain's first
  // step) whenever a new chain is pushed. Kit swaps deliberately do NOT
  // recreate the sequence, so the chain position survives them (issue #241).
  const chainState: ChainPlaybackState = {
    stepIndex: 0,
    repeatsRemaining: chain.steps[0]?.repeats ?? 1,
  };

  let currentVariation = chainEnabled
    ? (chain.steps[0]?.variation ?? clampVariationId(getLatestVariation()))
    : clampVariationId(getLatestVariation());
  onVariationChange?.(currentVariation);

  const totalSteps =
    barBudget !== undefined ? barBudget * STEP_COUNT : Infinity;
  let stepsScheduled = 0;

  const sequence = new Sequence(
    (time, step: number) => {
      // Stop scheduling once the bar budget is exhausted (offline only).
      if (stepsScheduled >= totalSteps) return;

      const { isFirstStep, isLastStep } = getStepBoundaries(step);

      if (isFirstStep) {
        currentVariation = variationForBarStart(
          chainEnabled,
          chain,
          chainState,
          getLatestVariation(),
        );
        onVariationChange?.(currentVariation);
      }

      const hitsForStep =
        getPrecomputedPattern()?.stepsByVariation[currentVariation][step];

      if (hitsForStep && hitsForStep.length > 0) {
        // The sequence callback's time is already in seconds; pass it
        // straight through (hot path - avoids a Time allocation per step).
        scheduleStepHits(
          hitsForStep,
          step,
          time,
          currentVariation,
          getStepContext(),
        );
      }

      stepsScheduled++;

      // Stop the sequence after the last step of the final budgeted bar.
      if (isLastStep && stepsScheduled >= totalSteps) {
        sequence.stop();
      }

      if (isLastStep) {
        advanceChainAtEndOfBar(chainEnabled, chain, chainState);
      }
    },
    SEQUENCE_EVENTS,
    SEQUENCE_SUBDIVISION,
  );

  sequence.start(0);
  return sequence;
}

// -----------------------------------------------------------------------------
// Core scheduling
// -----------------------------------------------------------------------------

/**
 * Schedules all precomputed hits for one step.
 * Shared by live playback and offline rendering.
 */
function scheduleStepHits(
  hits: PrecomputedHit[],
  step: number,
  timeSeconds: number,
  variationIndex: number,
  ctx: ScheduleStepContext,
): void {
  for (let i = 0; i < hits.length; i++) {
    const { voice, velocity } = hits[i];
    scheduleVoice(voice, step, timeSeconds, variationIndex, velocity, ctx);
  }
}

/**
 * Schedules a single voice's hit, including nudge, hat choke, flam, and
 * ratchet behavior. All params arrive pushed in domain units.
 */
function scheduleVoice(
  voice: Voice,
  step: number,
  timeSeconds: number,
  variationIndex: number,
  velocity: number,
  ctx: ScheduleStepContext,
): void {
  const index = voice.instrumentIndex;
  const channel = ctx.channels[index];
  const params = ctx.playParams[index];

  // If the channel or its params are missing (e.g. during a kit switch) or
  // its sample has not loaded yet, skip scheduling for this voice to avoid
  // transient runtime errors.
  if (!channel || !params || !channel.loaded) return;

  if ((ctx.anySolos && !params.solo) || params.mute) return;

  const variation = voice.variations[variationIndex];

  // Apply timing nudge: convert beat offset to seconds based on snapshot BPM.
  // Default to 0 for backward compatibility with presets that don't have timingNudge
  const timingNudge = variation.timingNudge ?? 0;
  const beatOffset = nudgeToBeatOffset(timingNudge);
  const secondsPerBeat = 60 / ctx.bpm;
  const nudgeSeconds = beatOffset * secondsPerBeat;
  // Clamped to >= 0: a negative absolute time would throw a RangeError.
  // Only live playback can get near the floor (the live transport starts
  // near context time 0); offline renders start past renderWav's pre-roll,
  // so a step-0 negative nudge stays positive there and simply lands ahead
  // of the bar line, where the export trims it.
  const adjustedTime = Math.max(0, timeSeconds + nudgeSeconds);

  // Closed hat mutes open hat (TR-909 style)
  if (ctx.roles[index] === "hat" && ctx.ohatIndex !== -1) {
    const ohChannel = ctx.channels[ctx.ohatIndex];
    const ohParams = ctx.playParams[ctx.ohatIndex];
    if (ohChannel && ohParams) {
      ohChannel.releasePitch(ohParams.pitch, adjustedTime);
    }
  }

  // Check for flam: trigger grace note before main hit.
  // flams/ratchets are non-optional on the Pattern type and backfilled for
  // legacy data by features/sequencer/lib/migrations.ts (migrateStepSequence);
  // the optional chaining is belt-and-braces without allocating a fallback
  // array on this hot path.
  const hasFlam = variation.flams?.[step] ?? false;
  if (hasFlam) {
    // Clamped for the same reason as adjustedTime: live playback near
    // context time 0. Offline, a step-0 grace note lands inside renderWav's
    // pre-roll (before the bar line) and is trimmed from the export.
    const flamGraceTime = Math.max(0, adjustedTime - FLAM_OFFSET_SECONDS);
    const flamGraceVelocity = velocity * FLAM_GRACE_VELOCITY;
    channel.trigger(flamGraceTime, {
      pitch: params.pitch,
      decaySeconds: params.decaySeconds,
      velocity: flamGraceVelocity,
    });
  }

  // Main trigger
  channel.trigger(adjustedTime, {
    pitch: params.pitch,
    decaySeconds: params.decaySeconds,
    velocity,
  });

  // Check for ratchet: trigger additional hit after main hit
  const hasRatchet = variation.ratchets?.[step] ?? false;
  if (hasRatchet) {
    const ratchetOffsetSeconds = RATCHET_OFFSET_BEATS * secondsPerBeat;
    const ratchetTime = Math.max(0, adjustedTime + ratchetOffsetSeconds);
    channel.trigger(ratchetTime, {
      pitch: params.pitch,
      decaySeconds: params.decaySeconds,
      velocity,
    });
  }
}

export { createPatternSequence };
export type { PatternSequenceOptions, ScheduleStepContext };
