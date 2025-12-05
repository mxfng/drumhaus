/**
 * Audio Engine
 *
 * Centralized audio engine logic for creating and managing Tone.js audio nodes.
 * All Tone.js object creation should happen in this directory.
 */

// Drum Sequence
export {
  createDrumSequence,
  disposeDrumSequence,
  createOfflineSequence,
} from "./sequencer/sequencer";

// Instrument Processing (unified module)
export {
  // Lifecycle
  createInstrumentRuntime,
  createInstrumentRuntimes,
  disposeInstrumentRuntime,
  disposeInstrumentRuntimes,
  // Nodes
  buildInstrumentNodes,
  disposeInstrumentNodes,
  // Routing
  chainInstrumentNodes,
  connectInstrumentToMasterChain,
  connectInstrumentsToMasterChain,
  // Parameters
  subscribeRuntimeToInstrumentParams,
  applyInstrumentParams,
  // Triggering
  triggerInstrument,
  stopInstrumentRuntimeAtTime,
  releaseAllInstrumentRuntimes,
  // Solo/Mute
  releaseNonSoloRuntimes,
  hasAnySolo,
  getSoloStates,
  soloStatesChanged,
  createSoloChangeHandler,
} from "./instrument";

// Master Chain
export {
  createMasterChainRuntimes,
  initializeMasterChain,
  updateMasterChainParams,
  disposeMasterChainRuntimes,
  type MasterChainRuntimes,
} from "./fx/masterChain";

// Sample Sources
export {
  prepareSampleSourceResolver,
  type SampleSourceResolver,
  type SamplerSource,
} from "../cache/sample";

// Buffer
export { awaitBufferLoaded as waitForBuffersToLoad } from "./buffer/buffer";

// Audio Context
export {
  ensureAudioContextIsRunning as ensureAudioContextIsRunning,
  getAudioContextHealth,
} from "./context/manager";

// Transport
export {
  startAudioContext,
  startTransport,
  stopTransport,
  getCurrentTime,
  setTransportBpm,
  setTransportSwing,
  configureTransportTiming,
} from "./transport/transport";
