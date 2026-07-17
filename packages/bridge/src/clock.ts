/**
 * Grid math for the shared musical clock.
 *
 * The session's grid is fully determined by (startEpochMs, bpm) in fixed 4/4:
 * beat n falls at startEpochMs + n * beatMs(bpm), bar k at
 * startEpochMs + k * barMs(bpm). Every function here is pure; anything that
 * needs "now" takes the instant as an argument (or an injectable clock), so
 * the math is deterministic and testable.
 */

import { BPM_MAX, BPM_MIN, type SessionState } from "./types";

/** Beats per bar; v1 is fixed 4/4 by design (see README). */
const BEATS_PER_BAR = 4;

/**
 * The shared epoch clock: performance.timeOrigin + performance.now().
 * Comparable across same-machine same-browser tabs to about 1ms, which is
 * what makes (startEpochMs, bpm) a shared grid at all.
 */
function epochNowMs(): number {
  return performance.timeOrigin + performance.now();
}

/** Clamp a tempo into the protocol's [BPM_MIN, BPM_MAX] range. */
function clampBpm(bpm: number): number {
  return Math.min(BPM_MAX, Math.max(BPM_MIN, bpm));
}

/** Duration of one beat in milliseconds at the given tempo. */
function beatMs(bpm: number): number {
  return 60_000 / bpm;
}

/** Duration of one 4/4 bar in milliseconds at the given tempo. */
function barMs(bpm: number): number {
  return BEATS_PER_BAR * beatMs(bpm);
}

/**
 * Beats elapsed since bar 0 beat 0 at the given epoch instant, or null when
 * the session is stopped. Negative during the start lead window (the count-in
 * before the downbeat lands).
 */
function beatsAt(state: SessionState, epochMs: number): number | null {
  if (!state.playing || state.startEpochMs === null) return null;
  return (epochMs - state.startEpochMs) / beatMs(state.bpm);
}

/** Bars elapsed since bar 0 at the given epoch instant, or null when stopped. */
function barsAt(state: SessionState, epochMs: number): number | null {
  const beats = beatsAt(state, epochMs);
  return beats === null ? beats : beats / BEATS_PER_BAR;
}

/**
 * Epoch instant of the first bar boundary strictly after the given instant,
 * or null when stopped. During the start lead window this is bar 0's downbeat
 * itself (startEpochMs).
 */
function nextBarStartEpochMs(
  state: SessionState,
  epochMs: number,
): number | null {
  const bars = barsAt(state, epochMs);
  if (bars === null || state.startEpochMs === null) return null;
  return state.startEpochMs + (Math.floor(bars) + 1) * barMs(state.bpm);
}

/**
 * Change tempo preserving phase continuity: the beat position at the decision
 * instant is identical under the old and new grids. With beats elapsed
 * B = (atEpochMs - startEpochMs) / beatMs(oldBpm), the rebased origin is
 * startEpochMs' = atEpochMs - B * beatMs(newBpm). While stopped this reduces
 * to setting bpm. The rev is left untouched; bumping it is the conductor's
 * job.
 */
function rebaseTempo(
  state: SessionState,
  newBpm: number,
  atEpochMs: number,
): SessionState {
  const bpm = clampBpm(newBpm);
  if (!state.playing || state.startEpochMs === null) {
    return { ...state, bpm };
  }
  const beatsElapsed = (atEpochMs - state.startEpochMs) / beatMs(state.bpm);
  return {
    ...state,
    bpm,
    startEpochMs: atEpochMs - beatsElapsed * beatMs(bpm),
  };
}

/**
 * The subset of AudioContext the epoch mapping needs. Structural, so tests
 * can fake it and any AudioContext (or Tone.js rawContext) satisfies it.
 */
interface BridgeAudioContext {
  currentTime: number;
  getOutputTimestamp?: () => {
    contextTime?: number;
    performanceTime?: number;
  };
}

/**
 * Which clock source produced an anchor: "outputTimestamp" is the preferred
 * speaker-aligned branch (output latency compensated); "currentTime" is the
 * documented fallback, which loses output-latency compensation (audio lands
 * late at the speaker by the context's whole output latency).
 */
type ClockAnchorKind = "outputTimestamp" | "currentTime";

interface ClockAnchor {
  contextTimeS: number;
  epochMs: number;
  /** The branch that produced this (contextTime, epoch) pair. */
  kind: ClockAnchorKind;
}

/**
 * Sample one (contextTime, epoch) pair to anchor the linear mapping between
 * the AudioContext clock and the epoch clock.
 *
 * Preferred source is ctx.getOutputTimestamp(), which pairs a context time
 * with the performance.now() instant at which that audio actually reaches the
 * output - so epoch-scheduled events line up at the speaker across tabs.
 * Fallback (documented, not a hack): when getOutputTimestamp is unavailable
 * (older WebKit) or returns zeros (contexts that have not produced output
 * yet, e.g. suspended), sample ctx.currentTime against the epoch clock
 * directly. The fallback ignores output latency but keeps the mapping honest
 * to within a few milliseconds, consistent with the library's
 * musically-tight-not-sample-locked contract.
 *
 * The returned kind names the branch taken, so instruments and tests can
 * observe a mapping that silently degraded onto the fallback (issue #429) -
 * the ~30ms constant error of #425 was invisible precisely because nothing
 * reported which branch anchored the mapping.
 */
function contextClockAnchor(
  ctx: BridgeAudioContext,
  epochNow: () => number = epochNowMs,
): ClockAnchor {
  const ts = ctx.getOutputTimestamp?.();
  if (
    ts &&
    typeof ts.contextTime === "number" &&
    typeof ts.performanceTime === "number" &&
    (ts.contextTime !== 0 || ts.performanceTime !== 0)
  ) {
    return {
      contextTimeS: ts.contextTime,
      epochMs: performance.timeOrigin + ts.performanceTime,
      kind: "outputTimestamp",
    };
  }
  return {
    contextTimeS: ctx.currentTime,
    epochMs: epochNow(),
    kind: "currentTime",
  };
}

/**
 * Map an epoch instant (ms) to the given AudioContext's time (seconds), for
 * scheduling: schedule bar 0 at epochToContextTime(ctx, state.startEpochMs).
 */
function epochToContextTime(
  ctx: BridgeAudioContext,
  epochMs: number,
  epochNow: () => number = epochNowMs,
): number {
  const anchor = contextClockAnchor(ctx, epochNow);
  return anchor.contextTimeS + (epochMs - anchor.epochMs) / 1000;
}

/** Inverse of epochToContextTime: context seconds to an epoch instant (ms). */
function contextTimeToEpochMs(
  ctx: BridgeAudioContext,
  contextTimeS: number,
  epochNow: () => number = epochNowMs,
): number {
  const anchor = contextClockAnchor(ctx, epochNow);
  return anchor.epochMs + (contextTimeS - anchor.contextTimeS) * 1000;
}

export {
  barMs,
  barsAt,
  beatMs,
  beatsAt,
  BEATS_PER_BAR,
  clampBpm,
  contextClockAnchor,
  contextTimeToEpochMs,
  epochNowMs,
  epochToContextTime,
  nextBarStartEpochMs,
  rebaseTempo,
};
export type { BridgeAudioContext, ClockAnchor, ClockAnchorKind };
