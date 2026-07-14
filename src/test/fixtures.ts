/**
 * Browser-only test fixtures: synthetic sample blob URLs, instrument data,
 * and pattern construction helpers for golden render tests.
 */

import type { InstrumentRole } from "@/core/audio/engine/instrument/types";
import { encodeWav } from "@/core/audio/export/wav-encoder";
import type {
  InstrumentData,
  InstrumentParams,
} from "@/features/instrument/types/instrument";
import { createEmptyPattern } from "@/features/sequencer/lib/helpers";
import type { Pattern, TimingNudge } from "@/features/sequencer/types/pattern";
import type { VariationId } from "@/features/sequencer/types/sequencer";

const FIXTURE_SAMPLE_RATE = 44100;

/**
 * Neutral instrument knob values: tune centered, full decay, filter centered,
 * unity volume, centered pan.
 *
 * Deliberately hand-pinned rather than derived from init(): these are
 * golden-stability snapshots, so golden renders cannot silently shift when
 * the app's default preset changes. Any edit here invalidates the golden
 * baselines - change these values only on purpose.
 */
const DEFAULT_INSTRUMENT_PARAMS: InstrumentParams = {
  tune: 50,
  decay: 100,
  filter: 50,
  volume: 92,
  pan: 50,
  solo: false,
  mute: false,
};

function samplesToBlobUrl(samples: Float32Array<ArrayBuffer>): string {
  const buffer = new AudioBuffer({
    length: samples.length,
    sampleRate: FIXTURE_SAMPLE_RATE,
    numberOfChannels: 1,
  });
  buffer.copyToChannel(samples, 0);
  const wav = encodeWav(buffer);
  return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
}

/**
 * A short click: 10ms of exponential decay from 1.0 with a ~2ms time
 * constant. Sharp transient, ideal for onset detection.
 */
function makeClickSampleUrl(): string {
  const length = Math.round(0.01 * FIXTURE_SAMPLE_RATE);
  const timeConstantSamples = 0.002 * FIXTURE_SAMPLE_RATE;
  const samples = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    samples[n] = Math.exp(-n / timeConstantSamples);
  }
  return samplesToBlobUrl(samples);
}

/**
 * A sustained 440Hz sine at constant 0.5 amplitude with instant attack and
 * no fade. Used for choke/decay tests where the tail must be audible.
 */
function makeToneSampleUrl(durationSeconds = 1.5): string {
  const length = Math.round(durationSeconds * FIXTURE_SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    samples[n] = 0.5 * Math.sin((2 * Math.PI * 440 * n) / FIXTURE_SAMPLE_RATE);
  }
  return samplesToBlobUrl(samples);
}

/**
 * Builds an InstrumentData with plausible dummy metadata. The sample path is
 * a unique placeholder; renderFixture maps it to the parallel sampleUrls
 * entry via its resolver.
 */
function makeInstrument(
  index: number,
  role: InstrumentRole,
  overrides?: Partial<InstrumentParams>,
): InstrumentData {
  return {
    meta: { id: `test-inst-${index}`, name: `Test ${role} ${index}` },
    role,
    sample: {
      meta: { id: `test-sample-${index}`, name: `Test sample ${index}` },
      path: `test-sample-${index}.wav`,
    },
    params: { ...DEFAULT_INSTRUMENT_PARAMS, ...overrides },
  };
}

interface StepEdit {
  voice: number;
  step: number;
  /** Defaults to variation A (0). */
  variation?: VariationId;
  /** Defaults to the empty pattern's 1.0. */
  velocity?: number;
  flam?: boolean;
  ratchet?: boolean;
}

interface AccentEdit {
  step: number;
  /** Defaults to variation A (0). */
  variation?: VariationId;
}

interface NudgeEdit {
  voice: number;
  nudge: TimingNudge;
  /** Defaults to variation A (0). */
  variation?: VariationId;
}

interface PatternEdits {
  steps?: StepEdit[];
  accents?: AccentEdit[];
  nudges?: NudgeEdit[];
}

/**
 * Starts from an empty pattern and applies trigger/velocity/flam/ratchet,
 * accent, and timing-nudge edits.
 */
function makePattern(edits: PatternEdits = {}): Pattern {
  const pattern = createEmptyPattern();

  for (const edit of edits.steps ?? []) {
    const sequence = pattern.voices[edit.voice].variations[edit.variation ?? 0];
    sequence.triggers[edit.step] = true;
    if (edit.velocity !== undefined) {
      sequence.velocities[edit.step] = edit.velocity;
    }
    if (edit.flam !== undefined) {
      sequence.flams[edit.step] = edit.flam;
    }
    if (edit.ratchet !== undefined) {
      sequence.ratchets[edit.step] = edit.ratchet;
    }
  }

  for (const edit of edits.accents ?? []) {
    pattern.variationMetadata[edit.variation ?? 0].accent[edit.step] = true;
  }

  for (const edit of edits.nudges ?? []) {
    pattern.voices[edit.voice].variations[edit.variation ?? 0].timingNudge =
      edit.nudge;
  }

  return pattern;
}

export {
  DEFAULT_INSTRUMENT_PARAMS,
  FIXTURE_SAMPLE_RATE,
  makeClickSampleUrl,
  makeToneSampleUrl,
  makeInstrument,
  makePattern,
};
export type { PatternEdits, StepEdit, AccentEdit, NudgeEdit };
