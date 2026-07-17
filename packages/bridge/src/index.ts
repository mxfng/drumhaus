/**
 * @haus/bridge - serverless cross-instrument session sync for the haus
 * family. See README.md for the protocol specification (document of record).
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
  HausLockManager,
} from "./election";
export { createHausSession } from "./session";
export type { CreateHausSessionOptions, HausSession } from "./session";
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
  HausPeer,
  SceneId,
  SessionIntent,
  SessionState,
} from "./types";
