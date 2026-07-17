import { getTransport, Ticks } from "tone/build/esm/index";

import { SEQUENCE_SUBDIVISION, STEP_COUNT } from "../constants";
import {
  getNativeAudioContext,
  getTransportClockCancel,
  getTransportClockDispatchWatermark,
  getTransportClockTickMath,
} from "../tone-internals";

/**
 * The LIVE transport, captured once at module evaluation.
 *
 * Tone's Offline() swaps the global context (and therefore what
 * getTransport() returns) while an offline render is being set up, and that
 * setup awaits sample loading - so a transport command issued from the app
 * during that window would otherwise land on the OFFLINE transport and be
 * lost or corrupt the render. Routing every live command through this
 * retained reference makes that impossible; the offline path receives its
 * own transport explicitly (configureTransportTiming).
 *
 * Import order cannot capture an offline transport: ESM modules evaluate
 * when the import graph loads, and Offline() is only ever entered from
 * engine code that (transitively) imports this module, so this line always
 * runs against the live context before any render can begin.
 */
const liveTransport = getTransport();

/**
 * The context time of the last scheduled (aligned) start, while it may still
 * be pending in the future; null once playback is stopped or was started
 * immediately. Lets a superseding start (or a stop) remove the pending one
 * cleanly before issuing its own commands.
 */
let pendingStartAt: number | null = null;

/**
 * Remove a still-pending scheduled start from the transport clock, leaving
 * no trace. Without this, a superseding start would be silently ignored by
 * Tone's already-started guard and the transport would run on the
 * superseded grid.
 *
 * The clean path cancels the pending events off the clock's state timeline
 * (tone-internals): Clock.stop(pending) is NOT equivalent - it also inserts
 * a stopped event at that instant, and a stray future stop outlives any
 * superseding start scheduled at a different instant (an earlier start then
 * dies when the stray stop is reached; a later realign leaves a silence gap
 * until its boundary - both probe-confirmed in the #440 review). The
 * fallback, when Tone's internals ever change shape, IS that stop call:
 * degraded back to exactly that edge, never worse.
 */
function cancelPendingScheduledStart(): void {
  if (pendingStartAt === null) return;
  const pending = pendingStartAt;
  pendingStartAt = null;
  // "Effectively begun" is measured against the clock's dispatch watermark
  // (everything at or below Clock._lastUpdate has been handed to the tick
  // loop), not now()+lookahead: a start inside the lookahead window but not
  // yet dispatched is still cleanly cancellable, and routing it through the
  // begun path instead would fire the TickSource resurrection branch once
  // (old-position phantoms bounded by the lookahead - #440 review).
  const watermark =
    getTransportClockDispatchWatermark(liveTransport) ?? liveTransport.now();
  if (pending <= watermark) return; // dispatched; the transport runs on it
  const cancel = getTransportClockCancel(liveTransport);
  if (cancel) {
    cancel(pending);
    return;
  }
  liveTransport.stop(pending);
}

/** Nudge step and cap for the first-tick float pre-flight below. */
const START_NUDGE_S = 5e-6;
const START_NUDGE_TRIES = 8;

/**
 * Pre-flight Tone's first-tick float guard: forEachTickBetween skips the
 * tick AT a start instant when getTimeOfTick(getTicksAtTime(at)) rounds
 * one ULP below `at` - float noise that accumulates in the frequency
 * signal's timeline across restarts and tempo writes. A skipped first
 * tick silently drops the pattern's step-0 events (issue #440: the missed
 * first transient, ~15% of warm restarts). Evaluating the exact predicate
 * the guard uses, nudge `at` up by a few microseconds (inaudible) to the
 * first instant the guard accepts; without internals access, return `at`
 * unchanged (status quo).
 *
 * The pre-flight is a snapshot: a bpm/swing write landing between this
 * evaluation and the start instant re-shapes the frequency timeline and can
 * invalidate the nudge. That degrades back to the status-quo skip risk for
 * that one start only - never worse - and the engine's own start path
 * applies tempo BEFORE scheduling the transport, so the common flows never
 * hit it.
 */
function floatSafeStartTime(atContextTime: number): number {
  const tickMath = getTransportClockTickMath(liveTransport);
  if (!tickMath) return atContextTime;
  for (let i = 0; i < START_NUDGE_TRIES; i++) {
    const candidate = atContextTime + i * START_NUDGE_S;
    if (
      tickMath.getTimeOfTick(tickMath.getTicksAtTime(candidate)) >= candidate
    ) {
      return candidate;
    }
  }
  return atContextTime;
}

/**
 * Start the live transport and all sources synced to it.
 *
 * With no argument the transport starts immediately (the local path). With
 * atContextTime (absolute seconds on the live context's clock) it starts -
 * or restarts - exactly at that instant with position 0. This is the
 * session adapter's grid-aligned start (core/session).
 *
 * A RUNNING transport is stopped at that same instant first, so a realign
 * lands the downbeat on the boundary. A STOPPED transport is started
 * directly: calling stop(at) on it first is NOT the no-op it looks like -
 * Tone's TickSource.stop on an already-stopped source cancels the previous
 * COMPLETED stop ("cancel the previous stop"), which retroactively marks
 * the clock started through the whole pause gap. Measured consequences
 * (issue #440): 1-2 phantom steps from the old song position fire just
 * before the new downbeat on every warm restart, the renumbered tick 0 -
 * the pattern's first step - is skipped entirely on ~10-25% of restarts,
 * and the float debris can throw a RangeError out of the restart itself.
 */
function startTransport(atContextTime?: number): void {
  if (atContextTime === undefined) {
    // A local immediate start also supersedes any still-scheduled aligned
    // start (e.g. unlink during the lead window, then local play).
    cancelPendingScheduledStart();
    liveTransport.start();
    return;
  }
  atContextTime = floatSafeStartTime(atContextTime);
  cancelPendingScheduledStart();
  if (liveTransport.state === "started") {
    liveTransport.stop(atContextTime);
  }
  liveTransport.start(atContextTime);
  pendingStartAt = atContextTime;
}

/**
 * The LIVE context's underlying AudioContext, reached through the retained
 * live transport (so a call landing mid-offline-render can never hand out
 * the offline context).
 *
 * Used by the session adapter to map the shared epoch clock onto the audio
 * clock for grid-aligned starts. Tone's public Context.rawContext is a
 * standardized-audio-context wrapper WITHOUT getOutputTimestamp, and an
 * epoch mapping anchored on its currentTime lands audio late at the
 * speaker by the context's whole output latency (tens of ms - issue #425).
 * So this hands out the NATIVE context beneath the wrapper (same clock,
 * real getOutputTimestamp; via tone-internals.ts, which keeps its monopoly
 * on internals), falling back to the wrapper if the internals ever change
 * shape - degrading to uncompensated anchoring, never breaking the clock.
 */
function getLiveRawContext(): BaseAudioContext {
  const rawContext = liveTransport.context.rawContext;
  return getNativeAudioContext(rawContext) ?? rawContext;
}

/**
 * Stop the live transport and all sources synced to it.
 *
 * Guarded for the same Tone edge as startTransport: stop() on an
 * already-stopped transport resurrects the previous run instead of being a
 * no-op. A pending scheduled start is cancelled at its own instant; a
 * running transport is stopped now; a plainly stopped transport is left
 * untouched.
 */
function stopTransport(): void {
  cancelPendingScheduledStart();
  if (liveTransport.state === "started") {
    liveTransport.stop();
  }
}

/**
 * Set the live transport BPM, preserving the current swing.
 */
function setTransportBpm(bpm: number): void {
  configureTransportTiming(liveTransport, bpm, liveTransport.swing);
}

/**
 * Set the live transport swing in canonical units (Tone swing, clamped by the
 * engine to 0-TRANSPORT_SWING_MAX), preserving the current bpm. The transport
 * store already holds the canonical Tone swing, so the bridge forwards it
 * directly with no knob conversion.
 */
function setTransportSwing(swing: number): void {
  configureTransportTiming(liveTransport, liveTransport.bpm.value, swing);
}

/**
 * Configures transport timing settings from domain values (bpm, Tone swing).
 * Works with both online (getTransport) and offline transport objects, and
 * is the single assignment point for transport timing - the live setters
 * above route through it.
 */
function configureTransportTiming(
  transport: {
    bpm: { value: number };
    swing: number;
    swingSubdivision: string;
  },
  bpm: number,
  swing: number,
): void {
  transport.bpm.value = bpm;
  transport.swing = swing;
  transport.swingSubdivision = SEQUENCE_SUBDIVISION;
}

/**
 * The current audio context time of the LIVE context (routed through the
 * retained live transport so a call landing mid-offline-render never reads
 * the offline clock).
 */
function getCurrentTime(): number {
  return liveTransport.now();
}

/**
 * Calculate current step index (0-15) from live transport ticks
 * Use this directly in requestAnimationFrame loops to avoid React re-renders
 */
function getCurrentStepFromTransport(): number {
  const ticks = liveTransport.ticks;
  const ticksPerStep = Ticks(SEQUENCE_SUBDIVISION).valueOf();
  const currentStep = Math.floor(ticks / ticksPerStep) % STEP_COUNT;
  return currentStep;
}

export {
  startTransport,
  stopTransport,
  setTransportBpm,
  setTransportSwing,
  configureTransportTiming,
  getCurrentTime,
  getCurrentStepFromTransport,
  getLiveRawContext,
};
