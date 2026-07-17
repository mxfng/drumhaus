/**
 * Protocol v1 types, constants, and the defensive envelope parser.
 *
 * The package README is the protocol's document of record; this module is its
 * executable shape. Everything here is framework-free and has zero runtime
 * dependencies.
 */

/** Protocol version carried in every message envelope. */
const PROTOCOL_VERSION = 1;

/** Default BroadcastChannel name shared by every instrument on the origin. */
const CHANNEL_NAME = "haus-session";

/** Web Locks resource name whose holder is the session conductor. */
const LOCK_NAME = "haus:conductor";

/**
 * Lead applied when starting playback: the conductor places bar 0 beat 0 this
 * far in the future so every tab can schedule ahead of the downbeat.
 */
const START_LEAD_MS = 200;

/** Interval between heartbeat broadcasts from each connected peer. */
const HEARTBEAT_MS = 2000;

/**
 * Silence threshold after which a peer is presumed gone and dropped from the
 * peer list (just over two missed heartbeats).
 */
const PEER_TIMEOUT_MS = 5500;

/** Inclusive tempo bounds; every bpm entering the session state is clamped. */
const BPM_MIN = 40;
const BPM_MAX = 300;

/** Session state defaults before any conductor has spoken. */
const DEFAULT_BPM = 120;

/**
 * Scene index 0-3. The protocol carries only the bare index; what a scene
 * means belongs to each instrument, not to the bridge.
 */
type SceneId = 0 | 1 | 2 | 3;

/** Identity of one session participant (one instrument in one tab). */
interface HausPeer {
  /** Random per-session-instance id (crypto.randomUUID). */
  id: string;
  /** Instrument name, e.g. "drumhaus". */
  instrument: string;
  /** Optional human-facing label to distinguish multiple instances. */
  label?: string;
}

/**
 * The full shared session state. The musical grid is fully determined by
 * (startEpochMs, bpm) in fixed 4/4: no position or phase messages exist, and
 * every tab derives the grid deterministically (see clock.ts).
 */
interface SessionState {
  /** Monotonic revision counter; the conductor bumps it on every change. */
  rev: number;
  /** Tempo in beats per minute, clamped to [BPM_MIN, BPM_MAX]. */
  bpm: number;
  /** Whether the shared transport is running. */
  playing: boolean;
  /**
   * Epoch instant (ms) of bar 0 beat 0, or null when stopped. Playing and
   * startEpochMs are always consistent: playing implies non-null and vice
   * versa.
   */
  startEpochMs: number | null;
  /** Current scene index. */
  scene: SceneId;
}

/** A change request; any peer may issue one, only the conductor applies it. */
type SessionIntent =
  | { kind: "setBpm"; bpm: number }
  | { kind: "play" }
  | { kind: "stop" }
  | { kind: "setScene"; scene: SceneId };

interface EnvelopeBase {
  v: typeof PROTOCOL_VERSION;
  /** Sender peer id. */
  from: string;
}

/** Any peer: request a change; the conductor applies it and broadcasts. */
interface IntentMessage extends EnvelopeBase {
  type: "intent";
  intent: SessionIntent;
}

/** Conductor only: the full session state. */
interface StateMessage extends EnvelopeBase {
  type: "state";
  state: SessionState;
}

/** Any peer: announce joining; triggers heartbeat and state replies. */
interface HelloMessage extends EnvelopeBase {
  type: "hello";
  peer: HausPeer;
}

/** Any peer: periodic liveness, carrying the peer descriptor. */
interface HeartbeatMessage extends EnvelopeBase {
  type: "heartbeat";
  peer: HausPeer;
}

/** Any peer: leaving cleanly. */
interface GoodbyeMessage extends EnvelopeBase {
  type: "goodbye";
}

type BridgeMessage =
  | IntentMessage
  | StateMessage
  | HelloMessage
  | HeartbeatMessage
  | GoodbyeMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSceneId(value: unknown): value is SceneId {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

function isHausPeer(value: unknown): value is HausPeer {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (typeof value.instrument !== "string") return false;
  if (value.label !== undefined && typeof value.label !== "string")
    return false;
  return true;
}

function isSessionState(value: unknown): value is SessionState {
  if (!isRecord(value)) return false;
  if (!isFiniteNumber(value.rev) || !Number.isInteger(value.rev)) return false;
  if (
    !isFiniteNumber(value.bpm) ||
    value.bpm < BPM_MIN ||
    value.bpm > BPM_MAX
  ) {
    return false;
  }
  if (typeof value.playing !== "boolean") return false;
  if (value.startEpochMs !== null && !isFiniteNumber(value.startEpochMs))
    return false;
  // The v1 invariant: a derivable grid exists exactly while playing.
  if (value.playing !== (value.startEpochMs !== null)) return false;
  if (!isSceneId(value.scene)) return false;
  return true;
}

function isSessionIntent(value: unknown): value is SessionIntent {
  if (!isRecord(value)) return false;
  switch (value.kind) {
    case "setBpm":
      return isFiniteNumber(value.bpm);
    case "play":
    case "stop":
      return true;
    case "setScene":
      return isSceneId(value.scene);
    default:
      return false;
  }
}

/**
 * Validate one raw message off the wire. Returns null for anything that is
 * not a well-formed protocol v1 message: other protocol versions (peers
 * speaking a future version may share the channel someday), unknown types,
 * and malformed payloads are all rejected defensively rather than trusted.
 */
function parseBridgeMessage(data: unknown): BridgeMessage | null {
  if (!isRecord(data)) return null;
  if (data.v !== PROTOCOL_VERSION) return null;
  if (typeof data.from !== "string" || data.from.length === 0) return null;
  switch (data.type) {
    case "hello":
    case "heartbeat":
      if (!isHausPeer(data.peer) || data.peer.id !== data.from) return null;
      return data as unknown as HelloMessage | HeartbeatMessage;
    case "goodbye":
      return data as unknown as GoodbyeMessage;
    case "intent":
      if (!isSessionIntent(data.intent)) return null;
      return data as unknown as IntentMessage;
    case "state":
      if (!isSessionState(data.state)) return null;
      return data as unknown as StateMessage;
    default:
      return null;
  }
}

export {
  BPM_MAX,
  BPM_MIN,
  CHANNEL_NAME,
  DEFAULT_BPM,
  HEARTBEAT_MS,
  isSceneId,
  LOCK_NAME,
  parseBridgeMessage,
  PEER_TIMEOUT_MS,
  PROTOCOL_VERSION,
  START_LEAD_MS,
};
export type {
  BridgeMessage,
  GoodbyeMessage,
  HausPeer,
  HeartbeatMessage,
  HelloMessage,
  IntentMessage,
  SceneId,
  SessionIntent,
  SessionState,
  StateMessage,
};
