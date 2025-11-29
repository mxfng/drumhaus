/**
 * Audio Engine
 *
 * Centralized audio engine logic for creating and managing Tone.js audio nodes.
 * All Tone.js object creation should happen in this directory.
 */

// Types
export type {
  Ref,
  SequenceInstance,
  DrumSequenceStateProvider,
  SequencerFactory,
  TimeUtils,
} from "./types";

// Factory
export {
  createStateProvider,
  createSequencerFactory,
  createTimeUtils,
  defaultStateProvider,
  defaultSequencerFactory,
  defaultTimeUtils,
} from "./factory";

// Drum Sequence
export {
  createDrumSequence,
  disposeDrumSequence,
  configureTransportTiming,
  createOfflineSequence,
} from "./drumSequence";

// Instrument Runtimes
export {
  createInstrumentRuntimes,
  disposeInstrumentRuntimes,
  buildInstrumentRuntime,
} from "./instrumentRuntimes";
export {
  subscribeRuntimeToInstrumentParams,
  applyInstrumentParams,
} from "./instrumentParams";

// Master Chain
export {
  createMasterChainRuntimes,
  initializeMasterChain,
  connectInstrumentsToMasterChain,
  connectInstrumentRuntime,
  updateMasterChainParams,
  disposeMasterChainRuntimes,
  type MasterChainRuntimes,
} from "./masterChain";
export {
  releaseNonSoloRuntimes,
  hasAnySolo,
  getSoloStates,
  soloStatesChanged,
  createSoloChangeHandler,
} from "./solo";

// Sample Sources
export {
  prepareSampleSourceResolver,
  type SampleSourceResolver,
  type SamplerSource,
} from "../sampleSources";

// Buffer
export {
  getSampleDuration,
  waitForBuffersToLoad,
  type SampleDurationResult,
} from "./buffer";
export {
  ensureAudioContextRunning,
  getAudioContextHealth,
} from "./audioContextManager";

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
