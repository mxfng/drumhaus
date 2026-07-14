/**
 * Audio Engine
 *
 * Framework-free audio engine owning all Tone.js objects. State flows one
 * way: features -> bridge -> engine, via the AudioEngine facade's command
 * API in domain units. Nothing under engine/ imports React, Zustand, or
 * anything from features/ or shared/.
 */

// Facade (live playback, offline rendering, and recovery all go through it)
export { AudioEngine, getAudioEngine } from "./audio-engine";
