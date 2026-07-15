// --- MIDI export: pattern data -> Standard MIDI File, then download ---
//
// Store-free like wav-exporter.ts: the feature layer passes pattern, tempo,
// swing (already in Tone domain units), and voice descriptors in as
// arguments. Timing and velocity math mirror the live scheduler
// (engine/sequencer/sequencer.ts) and precompute (accent math) so a DAW
// plays the exported file back the way the app sounds.

import {
  FLAM_GRACE_VELOCITY,
  FLAM_OFFSET_SECONDS,
  RATCHET_OFFSET_BEATS,
  STEP_COUNT,
} from "../engine/constants";
import type { InstrumentRole } from "../engine/instrument/types";
import {
  nudgeToBeatOffset,
  sanitizeChain,
  type Pattern,
  type PatternChain,
  type VariationId,
} from "../engine/pattern-types";
import { buildPrecomputedPattern } from "../engine/sequencer/precompute";
import {
  advanceChainAtEndOfBar,
  variationForBarStart,
  type ChainPlaybackState,
} from "../engine/variation/chain";
import { downloadMidi, encodeMidi, type MidiNote } from "./midi-encoder";

// -----------------------------------------------------------------------------
// Timing constants (PPQ 480)
// -----------------------------------------------------------------------------

/**
 * Pulses per quarter note. 480 makes every app timing unit an integer tick:
 * a 16th step is 120 ticks, the ratchet offset (1/32 beat... 0.125 beat) is
 * 60 ticks, and one timing-nudge unit (1/96 beat) is exactly 5 ticks.
 */
const MIDI_PPQ = 480;

/** Ticks per 16th-note step. */
const TICKS_PER_STEP = MIDI_PPQ / 4;

/** Ticks per timing-nudge unit (1/96 of a beat). */
const TICKS_PER_NUDGE_UNIT = MIDI_PPQ / 96;

/** Ratchet hit offset after the main hit, in ticks (0.125 beat). */
const RATCHET_OFFSET_TICKS = RATCHET_OFFSET_BEATS * MIDI_PPQ;

/**
 * Note length for every exported hit: a 32nd (60 ticks). Drum hits are
 * one-shot triggers, so a short consistent gate reads cleanly in a DAW and
 * a main hit's note-off lands exactly on its ratchet's note-on (the encoder
 * orders offs before ons at equal ticks).
 */
const NOTE_DURATION_TICKS = MIDI_PPQ / 8;

/** Drum channel: MIDI channel 10, zero-based. */
const DRUM_CHANNEL = 9;

/**
 * Whether the transport swing is baked into exported note-on positions
 * (offbeat 16ths delayed exactly as Tone.js delays them audibly) or the
 * export stays on the straight 16th grid.
 *
 * PENDING MAINTAINER DECISION (see PR discussion): flip this constant to
 * switch the behavior; nothing else needs to change.
 */
const BAKE_SWING_INTO_EXPORT = true;

// -----------------------------------------------------------------------------
// Tick math (exported for tests)
// -----------------------------------------------------------------------------

/**
 * Swing delay in ticks for a step, replicating Tone.js Transport swing with
 * a 16n swingSubdivision: offbeat 16ths (odd steps) are delayed by
 * swing * 2/3 of an 8th note, i.e. swing * (2 * TICKS_PER_STEP) / 3. Even
 * steps sit on 8th-note boundaries and are never swung.
 *
 * Returns 0 for every step when swing baking is disabled.
 */
function swingDelayTicks(step: number, swing: number): number {
  if (!BAKE_SWING_INTO_EXPORT) return 0;
  if (step % 2 === 0) return 0;
  return Math.round(swing * ((2 * TICKS_PER_STEP) / 3));
}

/**
 * Flam grace-note offset in ticks. The scheduler places the grace note a
 * fixed 15ms before the main hit, so the tick distance depends on tempo.
 */
function flamOffsetTicks(bpm: number): number {
  const ticksPerSecond = (bpm / 60) * MIDI_PPQ;
  return Math.round(FLAM_OFFSET_SECONDS * ticksPerSecond);
}

/**
 * Scales a precomputed [0..1] velocity (accent math already applied) to
 * MIDI 1-127. Never 0: velocity 0 is a note-off in MIDI running status.
 */
function toMidiVelocity(velocity: number): number {
  return Math.min(127, Math.max(1, Math.round(velocity * 127)));
}

// -----------------------------------------------------------------------------
// General MIDI drum mapping
// -----------------------------------------------------------------------------

/**
 * GM percussion note candidates per instrument role, in preference order.
 * When a kit repeats a role (e.g. two kicks), later slots take the next
 * candidate so every lane keeps a distinct note in the DAW.
 */
const GM_ROLE_NOTES: Record<InstrumentRole, number[]> = {
  kick: [36, 35], // Bass Drum 1, Acoustic Bass Drum
  snare: [38, 40], // Acoustic Snare, Electric Snare
  clap: [39], // Hand Clap
  hat: [42, 44], // Closed Hi-Hat, Pedal Hi-Hat
  ohat: [46], // Open Hi-Hat
  tom: [45, 47, 50, 48, 43, 41], // Low, Low-Mid, High, Hi-Mid, Floor toms
  perc: [37, 56, 54, 70], // Side Stick, Cowbell, Tambourine, Maracas
  crash: [49, 57, 55], // Crash 1, Crash 2, Splash
  bass: [35, 36], // Acoustic Bass Drum (no GM drum slot for bass synths)
  synth: [], // No GM percussion analog; falls back below
  other: [], // No GM percussion analog; falls back below
};

/**
 * Fallback pool for roles without a GM analog or with exhausted candidates,
 * kept inside the GM percussion range so channel 10 always makes a sound.
 */
const GM_FALLBACK_NOTES = [51, 53, 56, 54, 37, 75, 76, 69, 70];

/**
 * Assigns one distinct GM percussion note per slot: role candidates first
 * (in slot order), then the fallback pool, then the first unused note in
 * the GM percussion range (35-81) as a last resort.
 */
function assignDrumNotes(roles: InstrumentRole[]): number[] {
  const used = new Set<number>();

  return roles.map((role) => {
    const candidates = [...GM_ROLE_NOTES[role], ...GM_FALLBACK_NOTES];
    let note = candidates.find((candidate) => !used.has(candidate));
    if (note === undefined) {
      for (let fallback = 35; fallback <= 81; fallback++) {
        if (!used.has(fallback)) {
          note = fallback;
          break;
        }
      }
    }
    note ??= 35;
    used.add(note);
    return note;
  });
}

// -----------------------------------------------------------------------------
// Pattern -> MIDI file
// -----------------------------------------------------------------------------

/** A drum voice's identity for track naming and GM note mapping. */
interface MidiVoiceDescriptor {
  name: string;
  role: InstrumentRole;
}

interface MidiExportOptions {
  /** Filename without extension; also written as the conductor track name. */
  filename: string;
  /** Number of bars to export; the chain arrangement advances per bar. */
  bars: number;
  bpm: number;
  /** Transport swing in Tone domain units (0-0.5), converted at the boundary. */
  swing: number;
  pattern: Pattern;
  chain: PatternChain;
  chainEnabled: boolean;
  /** Variation played for every bar when the chain is disabled. */
  variation: VariationId;
  /** Per-slot voice descriptors, in slot order. */
  voices: MidiVoiceDescriptor[];
}

/**
 * Builds the MIDI file data for a pattern export. Bar arrangement follows
 * the same chain semantics as WAV export: with the chain enabled each bar
 * advances through the chain (wrapping), otherwise every bar plays the
 * given variation.
 */
function buildMidiFile(options: MidiExportOptions) {
  const { pattern, bars, bpm, swing, chainEnabled, variation } = options;

  const precomputed = buildPrecomputedPattern(pattern);
  const chain = sanitizeChain(options.chain);
  const chainState: ChainPlaybackState = {
    stepIndex: 0,
    repeatsRemaining: chain.steps[0]?.repeats ?? 1,
  };

  const flamTicks = flamOffsetTicks(bpm);
  const notesBySlot: MidiNote[][] = options.voices.map(() => []);

  for (let bar = 0; bar < bars; bar++) {
    const barVariation = variationForBarStart(
      chainEnabled,
      chain,
      chainState,
      variation,
    );
    const barStartTick = bar * STEP_COUNT * TICKS_PER_STEP;

    for (let step = 0; step < STEP_COUNT; step++) {
      const hits = precomputed.stepsByVariation[barVariation][step];

      for (const hit of hits) {
        const slot = hit.voice.instrumentIndex;
        const lane = notesBySlot[slot];
        if (!lane) continue;

        const sequence = hit.voice.variations[barVariation];
        // Same nudge math as the scheduler, in ticks: nudge units are 1/96
        // of a beat, exactly TICKS_PER_NUDGE_UNIT ticks each at PPQ 480.
        const nudgeTicks =
          nudgeToBeatOffset(sequence.timingNudge ?? 0) * MIDI_PPQ;
        // Clamped to >= 0 like the scheduler's Math.max(0, ...): a step-0
        // negative nudge in the first bar cannot land before tick 0.
        const mainTick = Math.max(
          0,
          Math.round(
            barStartTick +
              step * TICKS_PER_STEP +
              swingDelayTicks(step, swing) +
              nudgeTicks,
          ),
        );
        const velocity = toMidiVelocity(hit.velocity);

        // Flam: grace note before the main hit at reduced velocity, clamped
        // to tick 0 at the very start of the file (mirroring the scheduler).
        if (sequence.flams?.[step]) {
          const graceTick = Math.max(0, mainTick - flamTicks);
          lane.push({
            tick: graceTick,
            note: 0, // assigned below
            velocity: toMidiVelocity(hit.velocity * FLAM_GRACE_VELOCITY),
            durationTicks: Math.min(
              NOTE_DURATION_TICKS,
              Math.max(1, mainTick - graceTick),
            ),
          });
        }

        lane.push({
          tick: mainTick,
          note: 0,
          velocity,
          durationTicks: NOTE_DURATION_TICKS,
        });

        // Ratchet: second hit a 32nd after the main hit at the same velocity.
        if (sequence.ratchets?.[step]) {
          lane.push({
            tick: mainTick + RATCHET_OFFSET_TICKS,
            note: 0,
            velocity,
            durationTicks: NOTE_DURATION_TICKS,
          });
        }
      }
    }

    advanceChainAtEndOfBar(chainEnabled, chain, chainState);
  }

  const drumNotes = assignDrumNotes(options.voices.map((voice) => voice.role));

  return {
    ppq: MIDI_PPQ,
    bpm,
    name: options.filename,
    tracks: options.voices.map((voice, slot) => ({
      name: voice.name,
      channel: DRUM_CHANNEL,
      notes: notesBySlot[slot].map((note) => ({
        ...note,
        note: drumNotes[slot],
      })),
    })),
  };
}

/**
 * Exports the pattern to a Standard MIDI File download.
 */
function exportToMidi(options: MidiExportOptions): void {
  const midiBuffer = encodeMidi(buildMidiFile(options));
  downloadMidi(midiBuffer, `${options.filename}.mid`);
}

// Bar-count suggestion is shared with WAV export so both formats follow the
// same arrangement semantics.
export { getSuggestedBars } from "./wav-exporter";
export {
  assignDrumNotes,
  BAKE_SWING_INTO_EXPORT,
  buildMidiFile,
  DRUM_CHANNEL,
  exportToMidi,
  flamOffsetTicks,
  MIDI_PPQ,
  NOTE_DURATION_TICKS,
  RATCHET_OFFSET_TICKS,
  swingDelayTicks,
  TICKS_PER_NUDGE_UNIT,
  TICKS_PER_STEP,
  toMidiVelocity,
};
export type { MidiExportOptions, MidiVoiceDescriptor };
