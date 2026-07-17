/**
 * The audio core: a classic lookahead scheduler that places click blips
 * directly on the shared session grid.
 *
 * The grid is fully determined by (startEpochMs, bpm): beat n falls at
 * startEpochMs + n * beatMs(bpm) on the shared epoch clock, and
 * epochToContextTime maps that instant onto this tab's AudioContext, so
 * every tab's clicks line up at the speaker. A setInterval wakes every
 * TICK_MS and schedules whatever beats fall inside the next LOOKAHEAD_MS -
 * timers only need to be roughly on time; the audio clock does the precise
 * placement.
 *
 * Raw WebAudio, no dependencies beyond @haus/bridge's clock math.
 */

import {
  beatMs,
  BEATS_PER_BAR,
  epochNowMs,
  epochToContextTime,
  type SessionState,
} from "@haus/bridge";

/** How often the scheduler wakes to top up the schedule. */
const TICK_MS = 25;

/** How far past "now" each wake schedules. */
const LOOKAHEAD_MS = 100;

/** Voicings: accent on beat 1 of each 4/4 bar, plain on beats 2-4. */
const ACCENT = { frequencyHz: 1760, peakGain: 0.5 };
const PLAIN = { frequencyHz: 880, peakGain: 0.3 };

/** Click envelope: instant attack, fast exponential decay to silence. */
const CLICK_DECAY_S = 0.05;

interface Metronome {
  /** React to a session state change: play, stop, tempo rebase. */
  update(state: SessionState): void;
  /** Stop scheduling, cancel pending clicks, release the timer. */
  dispose(): void;
}

interface Click {
  osc: OscillatorNode;
  gain: GainNode;
}

function createMetronome(ctx: AudioContext): Metronome {
  /** The grid currently being scheduled; null while stopped. */
  let grid: { startEpochMs: number; bpm: number } | null = null;
  /** Next absolute session beat index (counted from bar 0 beat 0). */
  let nextBeat = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  /** Scheduled but possibly unplayed clicks, cancellable on stop. */
  const pending = new Set<Click>();

  function scheduleClick(atContextTimeS: number, accented: boolean): void {
    const voice = accented ? ACCENT : PLAIN;
    // A beat can land marginally in the past (an exact-boundary join, timer
    // jitter); clamp so it still plays instead of throwing.
    const at = Math.max(atContextTimeS, ctx.currentTime);
    const osc = new OscillatorNode(ctx, { frequency: voice.frequencyHz });
    const gain = new GainNode(ctx, { gain: 0 });
    gain.gain.setValueAtTime(voice.peakGain, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + CLICK_DECAY_S);
    osc.connect(gain).connect(ctx.destination);
    const click: Click = { osc, gain };
    pending.add(click);
    osc.onended = () => {
      pending.delete(click);
      gain.disconnect();
    };
    osc.start(at);
    osc.stop(at + CLICK_DECAY_S);
  }

  /** Schedule every not-yet-scheduled beat inside the lookahead window. */
  function tick(): void {
    if (grid === null) return;
    const horizonEpochMs = epochNowMs() + LOOKAHEAD_MS;
    for (;;) {
      const beatEpochMs = grid.startEpochMs + nextBeat * beatMs(grid.bpm);
      if (beatEpochMs >= horizonEpochMs) return;
      scheduleClick(
        epochToContextTime(ctx, beatEpochMs),
        nextBeat % BEATS_PER_BAR === 0,
      );
      nextBeat += 1;
    }
  }

  function cancelPending(): void {
    for (const { osc, gain } of pending) {
      osc.onended = null;
      osc.stop();
      gain.disconnect();
    }
    pending.clear();
  }

  function update(state: SessionState): void {
    if (!state.playing || state.startEpochMs === null) {
      grid = null;
      cancelPending();
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      return;
    }
    if (
      grid !== null &&
      grid.startEpochMs === state.startEpochMs &&
      grid.bpm === state.bpm
    ) {
      return; // same grid; the running scheduler already has it
    }
    // Fresh start, mid-playback join, or tempo rebase: (re)derive the next
    // beat index from the new grid and schedule only beats still in the
    // future. On a fresh start the downbeat sits START_LEAD_MS ahead, so
    // elapsed beats are negative and ceil lands on beat 0; on a join it lands
    // on the first upcoming beat. After a rebase, the few clicks already
    // scheduled under the old grid are within LOOKAHEAD_MS of now and are
    // left to play out.
    grid = { startEpochMs: state.startEpochMs, bpm: state.bpm };
    const beatsElapsed =
      (epochNowMs() - state.startEpochMs) / beatMs(state.bpm);
    nextBeat = Math.max(0, Math.ceil(beatsElapsed));
    tick();
    if (timer === null) timer = setInterval(tick, TICK_MS);
  }

  function dispose(): void {
    grid = null;
    cancelPending();
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { update, dispose };
}

export { createMetronome };
export type { Metronome };
