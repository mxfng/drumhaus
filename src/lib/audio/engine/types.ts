/**
 * Audio Engine Type Abstractions
 *
 * These abstractions decouple the audio engine from React, Zustand, and Tone.js,
 * making it testable without those dependencies.
 */

import type { InstrumentData } from "@/types/instrument";
import type { Voice } from "@/types/pattern";

// =============================================================================
// Generic Types (replaces React's MutableRefObject)
// =============================================================================

/**
 * A mutable reference container. Framework-agnostic replacement for React's MutableRefObject.
 */
export interface Ref<T> {
  current: T;
}

// =============================================================================
// Time Types (abstracts Tone.js time representation)
// =============================================================================

/**
 * Represents a point in time for audio scheduling.
 * In production this maps to Tone.Unit.Time.
 */
export type TimeValue = number | string;

/**
 * Time utilities for converting between time representations.
 */
export interface TimeUtils {
  toSeconds(time: TimeValue): number;
  now(): number;
}

// =============================================================================
// State Provider Interfaces (abstracts Zustand stores)
// =============================================================================

/**
 * Provides access to instrument state for the drum sequencer.
 */
export interface InstrumentStateProvider {
  getInstruments(): InstrumentData[];
  getDurations(): number[];
}

/**
 * Provides access to pattern state for the drum sequencer.
 */
export interface PatternStateProvider {
  getPattern(): Voice[];
  getPlaybackVariation(): number;
  setPlaybackVariation(index: number): void;
}

/**
 * Provides access to transport state for the drum sequencer.
 */
export interface TransportStateProvider {
  setStepIndex(index: number): void;
}

/**
 * Combined state provider for the drum sequencer.
 */
export interface DrumSequenceStateProvider {
  instruments: InstrumentStateProvider;
  pattern: PatternStateProvider;
  transport: TransportStateProvider;
}

// =============================================================================
// Sequencer Abstractions (abstracts Tone.Sequence)
// =============================================================================

/**
 * Represents a running sequence instance.
 */
export interface SequenceInstance {
  start(time: number): SequenceInstance;
  stop(): void;
  dispose(): void;
  readonly state: "started" | "stopped" | "paused";
}

/**
 * Callback function for sequence events.
 */
export type SequenceCallback = (time: TimeValue, step: number) => void;

/**
 * Factory for creating audio sequences.
 */
export interface SequencerFactory {
  createSequence(
    callback: SequenceCallback,
    events: number[],
    subdivision: string,
  ): SequenceInstance;
}

// =============================================================================
// Audio Node Abstractions (minimal Tone.js node interfaces)
// =============================================================================

/**
 * Minimal interface for sampler operations used in the sequencer.
 */
export interface SamplerNode {
  loaded: boolean;
  triggerAttack(pitch: number, time: TimeValue, velocity?: number): void;
  triggerRelease(pitch: number, time: TimeValue): void;
}

/**
 * Minimal interface for envelope operations used in the sequencer.
 */
export interface EnvelopeNode {
  triggerAttack(time: TimeValue): void;
  triggerRelease(time: TimeValue): void;
}

/**
 * Abstract runtime representation for testability.
 * Maps to InstrumentRuntime but with abstract node types.
 */
export interface AbstractInstrumentRuntime {
  samplerNode: SamplerNode;
  envelopeNode: EnvelopeNode;
}
