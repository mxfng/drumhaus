/**
 * Instrument Audio Processing
 *
 * Modular per-instrument processing with envelope, filters, and panning.
 */

// Re-export types
export type {
  InstrumentData,
  InstrumentParams,
  InstrumentRole,
  InstrumentRuntime,
  ContinuousRuntimeParams,
  PerNoteParams,
} from "./types";

// Re-export lifecycle functions (high-level API)
export {
  createInstrumentRuntime,
  createInstrumentRuntimes,
  disposeInstrumentRuntime,
  disposeInstrumentRuntimes,
} from "./lifecycle";

// Re-export node construction (for granular control)
export { buildInstrumentNodes, disposeInstrumentNodes } from "./nodes";

// Re-export routing (for custom signal flow)
export {
  chainInstrumentNodes,
  connectInstrumentToMasterChain,
  connectInstrumentsToMasterChain,
} from "./routing";

// Re-export parameter handling
export {
  applyInstrumentParams,
  subscribeRuntimeToInstrumentParams,
} from "./params";

// Re-export triggering
export {
  triggerInstrumentAtTime,
  triggerInstrument,
  triggerInstrumentReleaseAtTime as stopInstrumentRuntimeAtTime,
  triggerAllInstrumentsReleaseAtTime as releaseAllInstrumentRuntimes,
} from "./trigger";

// Re-export solo/mute utilities
export {
  releaseNonSoloRuntimes,
  hasAnySolo,
  getSoloStates,
  soloStatesChanged,
  createSoloChangeHandler,
} from "./solo";
