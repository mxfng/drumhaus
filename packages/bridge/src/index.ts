/**
 * @haus/bridge - serverless cross-instrument session sync for the
 * instrument family. See README.md for the protocol specification
 * (document of record).
 */

export {
  barMs,
  barsAt,
  beatMs,
  beatsAt,
  BEATS_PER_BAR,
  clampBpm,
  contextTimeToEpochMs,
  epochNowMs,
  epochToContextTime,
  nextBarStartEpochMs,
  rebaseTempo,
} from "./clock";
export type { BridgeAudioContext } from "./clock";
export { createConductorElection } from "./election";
export type {
  ConductorElection,
  ConductorElectionOptions,
  LockManager,
} from "./election";
export { createSession } from "./session";
export type { CreateSessionOptions, Session } from "./session";
export { broadcastChannelTransport, memoryHub } from "./transport";
export type { BridgeTransport, MemoryHub } from "./transport";
export {
  BPM_MAX,
  BPM_MIN,
  CHANNEL_NAME,
  DEFAULT_BPM,
  HEARTBEAT_MS,
  LOCK_NAME,
  parseBridgeMessage,
  PEER_TIMEOUT_MS,
  PROTOCOL_VERSION,
  START_LEAD_MS,
} from "./types";
export type {
  BridgeMessage,
  Peer,
  SceneId,
  SessionIntent,
  SessionState,
} from "./types";
