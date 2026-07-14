/**
 * Audio Engine
 *
 * Framework-free audio engine owning all Tone.js objects. State flows one
 * way: features -> bridge -> engine, via the AudioEngine facade's command
 * API in domain units. Nothing under engine/ imports React, Zustand, or
 * anything from features/ or shared/.
 */

// Facade (live playback, offline rendering, and recovery all go through it)
export {
  AudioEngine,
  getAudioEngine,
  type EngineDiagnostics,
  type KitSampleDescriptor,
  type PlaybackConfig,
  type RenderWavOptions,
} from "./audio-engine";

// Master Bus settings shape (domain values; mapped at the bridge boundary)
export type { MasterChainSettings } from "./master-bus";

// Playback data model
export type { Pattern, PatternChain, VariationId } from "./pattern-types";

// Audio Context
export {
  ensureAudioContextIsRunning,
  getAudioContextHealth,
} from "./context/manager";
