/**
 * Audio Engine
 *
 * Centralized audio engine logic for creating and managing Tone.js audio nodes.
 * All Tone.js object creation should happen in this directory.
 */

// Drum Sequence
export { createDrumSequence, disposeDrumSequence } from "./drumSequence";

// Instrument Runtimes
export {
  createInstrumentRuntimes,
  disposeInstrumentRuntimes,
} from "./instrumentRuntimes";
export { subscribeRuntimeToInstrumentParams } from "./instrumentParams";

// Master Chain
export {
  createMasterChainRuntimes,
  connectInstrumentsToMasterChain,
  updateMasterChainParams,
  disposeMasterChainRuntimes,
  type MasterChainRuntimes,
} from "./masterChain";
export { releaseNonSoloRuntimes } from "./solo";

// Buffer
export {
  getSampleDuration,
  waitForBuffersToLoad,
  type SampleDurationResult,
} from "./buffer";

// Instrument Playback
export { playInstrumentSample } from "./instrumentPlayback";

// Frequency Analyzer
export {
  createFrequencyAnalyzer,
  disposeFrequencyAnalyzer,
} from "./frequencyAnalyzer";

// Transport
export {
  startAudioContext,
  startTransport,
  stopTransport,
  getCurrentTime,
  setTransportBpm,
  setTransportSwing,
  releaseAllRuntimes,
} from "./transport";
export { stopRuntimeAtTime } from "./runtimeStops";
