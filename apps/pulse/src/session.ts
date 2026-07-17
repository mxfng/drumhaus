/**
 * Pulse's session hookup: how an instrument integrates @haus/bridge.
 *
 * Pulse is always linked - that is its purpose - so this wraps one
 * createHausSession instance in exactly the surface the UI needs: a snapshot
 * getter per value plus a single change signal (the useSyncExternalStore
 * contract), and the four session commands.
 *
 * One bridge edge is handled here. Between connect() and either
 * onConductorChange(true) or the first onStateChange there is no conductor
 * to apply intents, so a command posted in that window would be dropped
 * (README, "Handover semantics"). Until one of those fires, user commands
 * are deferred: queued for the session and applied to a local optimistic
 * state so the UI and metronome respond immediately - the same treatment the
 * bridge gives commands issued before connect(). The window is page-load
 * sized (a solo tab wins conductorship almost instantly), and the optimistic
 * reducer below mirrors the bridge's own, built from its exported clock math.
 */

import {
  createHausSession,
  epochNowMs,
  rebaseTempo,
  START_LEAD_MS,
  type SceneId,
  type SessionState,
} from "@haus/bridge";

interface PulseSession {
  /** Join the shared session. Idempotent. */
  connect(): void;
  /** Leave the session (posts a goodbye so peers drop us immediately). */
  disconnect(): void;
  /** Current session state; optimistic while commands are deferred. */
  getState(): SessionState;
  /** Session size: this tab plus every known peer. */
  getPeerCount(): number;
  /** Whether this tab currently conducts the session. */
  getIsConductor(): boolean;
  /** Single change signal for state, peer count, and conductorship. */
  subscribe(listener: () => void): () => void;
  play(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setScene(scene: SceneId): void;
}

function createPulseSession(): PulseSession {
  const session = createHausSession({ instrument: "pulse" });

  /** True once a conductor exists: us, or one whose state we have seen. */
  let ready = false;
  /** Commands queued while not ready, replayed in order on readiness. */
  const deferred: (() => void)[] = [];
  /** Local view of deferred commands; null once the session is authoritative. */
  let optimistic: SessionState | null = null;

  let peerCount = 1;
  let isConductor = false;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const fn of listeners) fn();
  }

  function becomeReady(): void {
    if (ready) return;
    ready = true;
    optimistic = null;
    for (const send of deferred.splice(0)) send();
  }

  session.onStateChange(() => {
    // A state broadcast means a conductor spoke; intents will be applied.
    becomeReady();
    notify();
  });
  session.onConductorChange((conductor) => {
    isConductor = conductor;
    if (conductor) becomeReady();
    notify();
  });
  session.onPeersChange((peers) => {
    peerCount = peers.length + 1;
    notify();
  });

  /**
   * Route one command: straight to the session once ready, otherwise queue
   * it and apply the equivalent change to the optimistic state. If readiness
   * arrives via another conductor's state, the replayed intents round-trip
   * through it, so the optimistic view may snap to the conductor's for a
   * broadcast beat before the commands land - consistency wins.
   */
  function command(
    apply: (state: SessionState, atEpochMs: number) => SessionState,
    send: () => void,
  ): void {
    if (ready) {
      send();
      return;
    }
    deferred.push(send);
    optimistic = apply(optimistic ?? session.state, epochNowMs());
    notify();
  }

  return {
    connect: () => session.connect(),
    disconnect: () => session.disconnect(),
    getState: () => optimistic ?? session.state,
    getPeerCount: () => peerCount,
    getIsConductor: () => isConductor,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    play: () =>
      command(
        (state, atEpochMs) =>
          state.playing
            ? state
            : {
                ...state,
                playing: true,
                startEpochMs: atEpochMs + START_LEAD_MS,
              },
        () => session.play(),
      ),
    stop: () =>
      command(
        (state) =>
          state.playing
            ? { ...state, playing: false, startEpochMs: null }
            : state,
        () => session.stop(),
      ),
    setBpm: (bpm) =>
      command(
        (state, atEpochMs) => rebaseTempo(state, bpm, atEpochMs),
        () => session.setBpm(bpm),
      ),
    setScene: (scene) =>
      command(
        (state) => ({ ...state, scene }),
        () => session.setScene(scene),
      ),
  };
}

export { createPulseSession };
export type { PulseSession };
