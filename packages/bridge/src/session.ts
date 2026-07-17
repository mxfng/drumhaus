/**
 * The session facade: one object per instrument instance that joins the
 * shared musical session and exposes tempo, transport, and scene.
 *
 * Roles: the Web Locks holder is the conductor and owns the state - it
 * applies intents, bumps rev, and broadcasts. Everyone else follows: commands
 * become intent messages, and state messages with rev >= the local rev are
 * adopted. A solo tab wins the lock immediately and conducts itself, so the
 * library is near-zero-cost in that mode (one heartbeat every 2s).
 *
 * Transport, clock, and locks are injectable for deterministic tests; the
 * defaults are the real BroadcastChannel, epoch clock, and navigator.locks.
 */

import { epochNowMs, rebaseTempo } from "./clock";
import {
  createConductorElection,
  type ConductorElection,
  type HausLockManager,
} from "./election";
import { broadcastChannelTransport, type BridgeTransport } from "./transport";
import {
  DEFAULT_BPM,
  HEARTBEAT_MS,
  isSceneId,
  parseBridgeMessage,
  PEER_TIMEOUT_MS,
  PROTOCOL_VERSION,
  START_LEAD_MS,
  type HausPeer,
  type SceneId,
  type SessionIntent,
  type SessionState,
} from "./types";

interface CreateHausSessionOptions {
  /** Instrument name announced to peers, e.g. "drumhaus". */
  instrument: string;
  /** Optional human-facing label to distinguish multiple instances. */
  label?: string;
  /** Message transport; defaults to a BroadcastChannel on CHANNEL_NAME. */
  transport?: BridgeTransport;
  /** Epoch clock; defaults to epochNowMs. */
  now?: () => number;
  /** Lock manager for conductor election; defaults to navigator.locks. */
  locks?: HausLockManager;
}

interface HausSession {
  /** Current session state (immutable snapshot; never mutated in place). */
  readonly state: SessionState;
  /** Other currently-known peers (self excluded). */
  readonly peers: HausPeer[];
  /** Whether this instance currently holds conductorship. */
  readonly isConductor: boolean;
  /** Join the shared session. Idempotent. */
  connect(): void;
  /** Leave the session: goodbye, release conductorship, stop timers. */
  disconnect(): void;
  /** Request a tempo change (clamped to [BPM_MIN, BPM_MAX]). */
  setBpm(bpm: number): void;
  /** Request playback start (bar 0 lands START_LEAD_MS in the future). */
  play(): void;
  /** Request playback stop. */
  stop(): void;
  /** Request a scene change (0-3). */
  setScene(scene: SceneId): void;
  onStateChange(fn: (state: SessionState) => void): () => void;
  onPeersChange(fn: (peers: HausPeer[]) => void): () => void;
  onConductorChange(fn: (isConductor: boolean) => void): () => void;
}

/**
 * Apply one intent to the state at the given instant. Pure; returns null for
 * no-ops (redundant play/stop, unchanged bpm or scene, invalid values) so
 * callers only bump rev and broadcast on real changes. Rev is untouched here;
 * the conductor owns it.
 */
function reduceIntent(
  state: SessionState,
  intent: SessionIntent,
  atEpochMs: number,
): SessionState | null {
  switch (intent.kind) {
    case "setBpm": {
      if (!Number.isFinite(intent.bpm)) return null;
      const next = rebaseTempo(state, intent.bpm, atEpochMs);
      return next.bpm === state.bpm ? null : next;
    }
    case "play":
      if (state.playing) return null;
      return {
        ...state,
        playing: true,
        startEpochMs: atEpochMs + START_LEAD_MS,
      };
    case "stop":
      if (!state.playing) return null;
      return { ...state, playing: false, startEpochMs: null };
    case "setScene":
      if (!isSceneId(intent.scene) || intent.scene === state.scene) return null;
      return { ...state, scene: intent.scene };
  }
}

/** A message body before the envelope (v, from) is stamped on. */
type OutgoingBody =
  | { type: "intent"; intent: SessionIntent }
  | { type: "state"; state: SessionState }
  | { type: "hello"; peer: HausPeer }
  | { type: "heartbeat"; peer: HausPeer }
  | { type: "goodbye" };

function statesEqual(a: SessionState, b: SessionState): boolean {
  return (
    a.rev === b.rev &&
    a.bpm === b.bpm &&
    a.playing === b.playing &&
    a.startEpochMs === b.startEpochMs &&
    a.scene === b.scene
  );
}

function createHausSession(options: CreateHausSessionOptions): HausSession {
  const now = options.now ?? epochNowMs;
  const id = crypto.randomUUID();
  const self: HausPeer = {
    id,
    instrument: options.instrument,
    ...(options.label !== undefined ? { label: options.label } : {}),
  };

  let state: SessionState = {
    rev: 0,
    bpm: DEFAULT_BPM,
    playing: false,
    startEpochMs: null,
    scene: 0,
  };

  const peerEntries = new Map<string, { peer: HausPeer; lastSeenMs: number }>();
  const stateListeners = new Set<(state: SessionState) => void>();
  const peersListeners = new Set<(peers: HausPeer[]) => void>();
  const conductorListeners = new Set<(isConductor: boolean) => void>();

  let connected = false;
  let conductor = false;
  let transport: BridgeTransport | null = null;
  let ownsTransport = false;
  let unsubscribe: (() => void) | null = null;
  let election: ConductorElection | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  function subscribeTo<T>(
    listeners: Set<(value: T) => void>,
    fn: (value: T) => void,
  ) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }

  function peersSnapshot(): HausPeer[] {
    return [...peerEntries.values()].map((entry) => entry.peer);
  }

  function notifyPeers(): void {
    const snapshot = peersSnapshot();
    for (const fn of peersListeners) fn(snapshot);
  }

  function notifyConductor(): void {
    for (const fn of conductorListeners) fn(conductor);
  }

  function setState(next: SessionState): void {
    if (statesEqual(state, next)) return;
    state = next;
    for (const fn of stateListeners) fn(state);
  }

  function post(body: OutgoingBody): void {
    transport?.post({ v: PROTOCOL_VERSION, from: id, ...body });
  }

  function broadcastState(): void {
    post({ type: "state", state });
  }

  /**
   * Command entry point. Conductor (and a not-yet-connected standalone
   * session) applies locally; a connected follower posts an intent and waits
   * for the conductor's state broadcast. Standalone changes do not bump rev -
   * rev is a coordination counter owned by whoever conducts - so a later
   * conductor state at any rev is still adopted.
   */
  function command(intent: SessionIntent): void {
    if (connected && !conductor) {
      post({ type: "intent", intent });
      return;
    }
    const next = reduceIntent(state, intent, now());
    if (next === null) return;
    setState(conductor ? { ...next, rev: state.rev + 1 } : next);
    if (conductor) broadcastState();
  }

  function upsertPeer(peer: HausPeer): void {
    const existing = peerEntries.get(peer.id);
    peerEntries.set(peer.id, { peer, lastSeenMs: now() });
    if (
      !existing ||
      existing.peer.instrument !== peer.instrument ||
      existing.peer.label !== peer.label
    ) {
      notifyPeers();
    }
  }

  function sweepPeers(): void {
    const cutoff = now() - PEER_TIMEOUT_MS;
    let dropped = false;
    for (const [peerId, entry] of peerEntries) {
      if (entry.lastSeenMs < cutoff) {
        peerEntries.delete(peerId);
        dropped = true;
      }
    }
    if (dropped) notifyPeers();
  }

  function handleMessage(data: unknown): void {
    const msg = parseBridgeMessage(data);
    if (msg === null || msg.from === id) return;
    const known = peerEntries.get(msg.from);
    if (known) known.lastSeenMs = now();
    switch (msg.type) {
      case "hello":
        upsertPeer(msg.peer);
        // Reply so the joiner learns us without waiting a heartbeat period.
        post({ type: "heartbeat", peer: self });
        if (conductor) broadcastState();
        break;
      case "heartbeat":
        upsertPeer(msg.peer);
        break;
      case "goodbye":
        if (peerEntries.delete(msg.from)) notifyPeers();
        break;
      case "intent":
        if (conductor) {
          const next = reduceIntent(state, msg.intent, now());
          if (next !== null) {
            setState({ ...next, rev: state.rev + 1 });
            broadcastState();
          }
        }
        break;
      case "state":
        // The rev guard makes stale rebroadcasts during handover harmless.
        if (!conductor && msg.state.rev >= state.rev) setState(msg.state);
        break;
    }
  }

  function connect(): void {
    if (connected) return;
    connected = true;
    ownsTransport = options.transport === undefined;
    transport = options.transport ?? broadcastChannelTransport();
    unsubscribe = transport.subscribe(handleMessage);
    election = createConductorElection({
      ...(options.locks !== undefined ? { locks: options.locks } : {}),
      onAcquired: () => {
        conductor = true;
        notifyConductor();
        // Rebroadcast the last-seen state (same rev) so late joiners and the
        // handover window converge on the new conductor's view.
        broadcastState();
      },
    });
    election.start();
    post({ type: "hello", peer: self });
    heartbeatTimer = setInterval(() => {
      post({ type: "heartbeat", peer: self });
      sweepPeers();
    }, HEARTBEAT_MS);
  }

  function disconnect(): void {
    if (!connected) return;
    post({ type: "goodbye" });
    connected = false;
    if (heartbeatTimer !== null) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    election?.stop();
    election = null;
    unsubscribe?.();
    unsubscribe = null;
    if (ownsTransport) transport?.close();
    transport = null;
    if (conductor) {
      conductor = false;
      notifyConductor();
    }
    if (peerEntries.size > 0) {
      peerEntries.clear();
      notifyPeers();
    }
  }

  return {
    get state() {
      return state;
    },
    get peers() {
      return peersSnapshot();
    },
    get isConductor() {
      return conductor;
    },
    connect,
    disconnect,
    setBpm: (bpm) => command({ kind: "setBpm", bpm }),
    play: () => command({ kind: "play" }),
    stop: () => command({ kind: "stop" }),
    setScene: (scene) => command({ kind: "setScene", scene }),
    onStateChange: (fn) => subscribeTo(stateListeners, fn),
    onPeersChange: (fn) => subscribeTo(peersListeners, fn),
    onConductorChange: (fn) => subscribeTo(conductorListeners, fn),
  };
}

export { createHausSession, reduceIntent };
export type { CreateHausSessionOptions, HausSession };
