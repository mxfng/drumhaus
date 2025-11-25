/**
 * Production Factory
 *
 * Creates real implementations of audio engine abstractions using
 * Tone.js and Zustand stores.
 *
 * This might be useful someday if we want to test the audio engine in isolation.
 *
 * TODO: Remove this at some point if we don't end up using it, it is a bit obtuse.
 */

import { now, Sequence, Time } from "tone/build/esm/index";

import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePatternStore } from "@/stores/usePatternStore";
import type {
  DrumSequenceStateProvider,
  SequenceCallback,
  SequenceInstance,
  SequencerFactory,
  TimeUtils,
} from "./types";

// =============================================================================
// State Provider Implementation
// =============================================================================

/**
 * Creates a state provider that reads from Zustand stores.
 */
export function createStateProvider(): DrumSequenceStateProvider {
  return {
    instruments: {
      getInstruments: () => useInstrumentsStore.getState().instruments,
      getDurations: () => useInstrumentsStore.getState().durations,
    },
    pattern: {
      getPattern: () => usePatternStore.getState().pattern,
      getPlaybackVariation: () => usePatternStore.getState().playbackVariation,
      setPlaybackVariation: (index: number) =>
        usePatternStore.getState().setPlaybackVariation(index),
    },
  };
}

// =============================================================================
// Sequencer Factory Implementation
// =============================================================================

/**
 * Creates a sequencer factory that uses Tone.Sequence.
 */
export function createSequencerFactory(): SequencerFactory {
  return {
    createSequence(
      callback: SequenceCallback,
      events: number[],
      subdivision: string,
    ): SequenceInstance {
      const sequence = new Sequence(
        (time, step: number) => callback(time, step),
        events,
        subdivision,
      );

      return {
        start(time: number) {
          sequence.start(time);
          return this;
        },
        stop() {
          sequence.stop();
        },
        dispose() {
          sequence.dispose();
        },
        get state() {
          return sequence.state as "started" | "stopped" | "paused";
        },
      };
    },
  };
}

// =============================================================================
// Time Utilities Implementation
// =============================================================================

/**
 * Creates time utilities using Tone.js.
 */
export function createTimeUtils(): TimeUtils {
  return {
    toSeconds(time) {
      return Time(time).toSeconds();
    },
    now() {
      return now();
    },
  };
}

// =============================================================================
// Default Instances
// =============================================================================

/**
 * Default state provider instance for production use.
 */
export const defaultStateProvider = createStateProvider();

/**
 * Default sequencer factory instance for production use.
 */
export const defaultSequencerFactory = createSequencerFactory();

/**
 * Default time utilities instance for production use.
 */
export const defaultTimeUtils = createTimeUtils();
