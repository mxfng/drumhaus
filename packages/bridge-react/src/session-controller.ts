/**
 * The framework-free core behind useSession: wraps one HausSession in
 * an external-store shape (cached snapshot + single change signal, the
 * useSyncExternalStore contract) and owns the deferred-command readiness
 * handling every instrument would otherwise reimplement.
 *
 * The readiness edge (bridge README, "Handover semantics"): between
 * connect() and the first evidence of a conductor - conductorship
 * ourselves, a state message, or a visible peer (see onPeersChange below)
 * - there is no conductor known to apply intents, so a command posted in
 * that window would be dropped. Until one of those fires, commands issued
 * while connected are deferred: queued for the session and applied to a local
 * optimistic state - built from the bridge's own exported clock math - so
 * the UI responds immediately. The window is page-load sized (a solo tab
 * wins conductorship almost instantly). If readiness arrives via another
 * conductor's state, the snapshot may snap to the conductor's view for a
 * broadcast beat before the replayed commands land; consistency wins.
 * (Semantics mirrored from the pulse reference implementation.)
 *
 * Commands issued while NOT connected pass straight through: the bridge
 * applies pre-connect commands locally without a rev bump, which is
 * exactly the seed-then-connect idiom (seed local tempo/scene, then
 * connect; a lone tab's seeded state broadcasts when it conducts, an
 * existing conductor's state wins otherwise).
 */

import {
  epochNowMs,
  rebaseTempo,
  START_LEAD_MS,
  type HausPeer,
  type HausSession,
  type SceneId,
  type SessionState,
} from "@haus/bridge";

/** One immutable view of the session, stable between change signals. */
interface SessionSnapshot {
  /** Session state; optimistic while commands are deferred. */
  state: SessionState;
  /** Other currently-known peers (self excluded). */
  peers: HausPeer[];
  /** Whether this tab currently conducts the session. */
  isConductor: boolean;
  /** Whether this controller is currently connected to the session. */
  linked: boolean;
}

interface SessionController {
  /** Cached snapshot; a new object exactly when something changed. */
  getSnapshot(): SessionSnapshot;
  /** Single change signal for state, peers, conductorship, and linked. */
  subscribe(listener: () => void): () => void;
  /** Join the shared session. Idempotent. */
  connect(): void;
  /** Leave the session, dropping any still-deferred commands. Idempotent. */
  disconnect(): void;
  play(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setScene(scene: SceneId): void;
}

interface SessionControllerOptions {
  /** Epoch clock for optimistic grid math; defaults to epochNowMs. */
  now?: () => number;
}

function createSessionController(
  session: HausSession,
  options: SessionControllerOptions = {},
): SessionController {
  const now = options.now ?? epochNowMs;

  let linked = false;
  /** True once a conductor exists: us, or one whose state we have seen. */
  let ready = false;
  /** Commands queued while connected but not ready, replayed in order. */
  const deferred: (() => void)[] = [];
  /** Local view of deferred commands; null once the session speaks. */
  let optimistic: SessionState | null = null;

  let peers: HausPeer[] = [];
  let isConductor = false;

  const listeners = new Set<() => void>();
  let snapshot: SessionSnapshot = {
    state: session.state,
    peers,
    isConductor,
    linked,
  };

  function emit(): void {
    snapshot = {
      state: optimistic ?? session.state,
      peers,
      isConductor,
      linked,
    };
    for (const listener of listeners) listener();
  }

  function becomeReady(): void {
    if (ready) return;
    ready = true;
    optimistic = null;
    for (const send of deferred.splice(0)) send();
  }

  session.onStateChange(() => {
    // A state broadcast means a conductor spoke; intents will be applied.
    // Pre-connect local applications (seeding) do NOT open the command
    // path - the readiness window only exists while connected.
    if (linked) becomeReady();
    emit();
  });
  session.onConductorChange((conductor) => {
    isConductor = conductor;
    if (conductor && linked) becomeReady();
    emit();
  });
  session.onPeersChange((nextPeers) => {
    peers = nextPeers;
    // Peers also open the command path: a conductor whose state happens to
    // equal ours broadcasts it in reply to our hello, but the bridge's
    // no-change guard fires no state event for it - only this peer signal
    // arrives. In production the conductor lock is always held by some
    // connected peer, so a visible peer implies an appliable session; the
    // residual race (a peer seen mid conductor-handover) degrades to the
    // protocol's accepted handover intent loss.
    if (linked && nextPeers.length > 0) becomeReady();
    emit();
  });

  /**
   * Route one command: straight to the session when not connected (local
   * pre-connect application, no rev bump) or once ready; queued with an
   * optimistic local application while the connect window is open.
   */
  function command(
    applyOptimistic: (state: SessionState, atEpochMs: number) => SessionState,
    send: () => void,
  ): void {
    if (!linked || ready) {
      send();
      return;
    }
    deferred.push(send);
    optimistic = applyOptimistic(optimistic ?? session.state, now());
    emit();
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect() {
      if (linked) return;
      linked = true;
      ready = false;
      session.connect();
      emit();
    },
    disconnect() {
      if (!linked) return;
      session.disconnect();
      linked = false;
      ready = false;
      deferred.length = 0;
      optimistic = null;
      emit();
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

export { createSessionController };
export type { SessionController, SessionSnapshot, SessionControllerOptions };
