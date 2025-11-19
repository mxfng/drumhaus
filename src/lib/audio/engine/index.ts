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
  INIT_INSTRUMENT_RUNTIMES,
} from "./instrumentRuntimes";

// Master Chain
export {
  createMasterChainRuntimes,
  connectInstrumentsToMasterChain,
  updateMasterChainParams,
  disposeMasterChainRuntimes,
  type MasterChainRuntimes,
  type MasterChainParams,
} from "./masterChain";

// Buffer
export { getSampleDuration, waitForBuffersToLoad } from "./buffer";

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
  releaseAllSamples,
} from "./transport";
