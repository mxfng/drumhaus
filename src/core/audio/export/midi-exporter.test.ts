import { describe, expect, it } from "vitest";

import { createEmptyPattern } from "@/features/sequencer/lib/helpers";
import {
  ACCENT_BOOST,
  ACCENT_DAMPEN,
  FLAM_GRACE_VELOCITY,
  FLAM_OFFSET_SECONDS,
  RATCHET_OFFSET_BEATS,
  TRANSPORT_SWING_MAX,
} from "../engine/constants";
import type { InstrumentRole } from "../engine/instrument/types";
import {
  assignDrumNotes,
  BAKE_SWING_INTO_EXPORT,
  buildMidiFile,
  DRUM_CHANNEL,
  flamOffsetTicks,
  MIDI_PPQ,
  NOTE_DURATION_TICKS,
  RATCHET_OFFSET_TICKS,
  swingDelayTicks,
  TICKS_PER_NUDGE_UNIT,
  TICKS_PER_STEP,
  toMidiVelocity,
  type MidiExportOptions,
} from "./midi-exporter";

const DEFAULT_ROLES: InstrumentRole[] = [
  "kick",
  "kick",
  "snare",
  "clap",
  "hat",
  "ohat",
  "tom",
  "crash",
];

function makeOptions(
  overrides: Partial<MidiExportOptions> = {},
): MidiExportOptions {
  return {
    filename: "test-export",
    bars: 1,
    bpm: 100,
    swing: 0,
    pattern: createEmptyPattern(),
    chain: { steps: [{ variation: 0, repeats: 1 }] },
    chainEnabled: false,
    variation: 0,
    voices: DEFAULT_ROLES.map((role, i) => ({ name: `Voice ${i}`, role })),
    ...overrides,
  };
}

function ticksForSlot(options: MidiExportOptions, slot: number): number[] {
  return buildMidiFile(options).tracks[slot].notes.map((note) => note.tick);
}

// -----------------------------------------------------------------------------
// Tick math helpers
// -----------------------------------------------------------------------------

describe("tick math", () => {
  it("uses integer ticks for every app timing unit at PPQ 480", () => {
    expect(MIDI_PPQ).toBe(480);
    expect(TICKS_PER_STEP).toBe(120);
    expect(TICKS_PER_NUDGE_UNIT).toBe(5); // 1/96 beat
    expect(RATCHET_OFFSET_TICKS).toBe(RATCHET_OFFSET_BEATS * MIDI_PPQ); // 60
    expect(NOTE_DURATION_TICKS).toBe(60); // a 32nd
  });

  it("converts the 15ms flam offset to tempo-dependent ticks", () => {
    // ticks = 0.015s * (bpm / 60) beats/s * 480 ticks/beat
    expect(flamOffsetTicks(100)).toBe(
      Math.round(FLAM_OFFSET_SECONDS * (100 / 60) * MIDI_PPQ),
    );
    expect(flamOffsetTicks(100)).toBe(12);
    expect(flamOffsetTicks(200)).toBe(24);
  });

  it.runIf(BAKE_SWING_INTO_EXPORT)(
    "delays offbeat 16ths by swing * 2/3 of an 8th, like Tone.js",
    () => {
      // Max app swing (knob 100) is Tone swing 0.375 -> 30 ticks (#269).
      expect(swingDelayTicks(1, TRANSPORT_SWING_MAX)).toBe(30);
      expect(swingDelayTicks(3, 0.25)).toBe(20);
      // Even steps sit on 8th boundaries and never swing.
      expect(swingDelayTicks(0, TRANSPORT_SWING_MAX)).toBe(0);
      expect(swingDelayTicks(2, TRANSPORT_SWING_MAX)).toBe(0);
      // No swing, no delay.
      expect(swingDelayTicks(1, 0)).toBe(0);
    },
  );

  it.runIf(!BAKE_SWING_INTO_EXPORT)(
    "keeps every step on the straight grid when swing baking is disabled",
    () => {
      expect(swingDelayTicks(1, TRANSPORT_SWING_MAX)).toBe(0);
      expect(swingDelayTicks(3, 0.25)).toBe(0);
    },
  );

  it("scales velocities to 1-127", () => {
    expect(toMidiVelocity(1)).toBe(127);
    expect(toMidiVelocity(0.5)).toBe(64);
    expect(toMidiVelocity(0)).toBe(1); // velocity 0 would read as a note-off
    expect(toMidiVelocity(2)).toBe(127);
  });
});

// -----------------------------------------------------------------------------
// General MIDI drum mapping
// -----------------------------------------------------------------------------

describe("assignDrumNotes", () => {
  it("maps the default kit layout to the documented GM notes", () => {
    expect(assignDrumNotes(DEFAULT_ROLES)).toEqual([
      36, // kick -> Bass Drum 1
      35, // second kick -> Acoustic Bass Drum
      38, // snare -> Acoustic Snare
      39, // clap -> Hand Clap
      42, // hat -> Closed Hi-Hat
      46, // ohat -> Open Hi-Hat
      45, // tom -> Low Tom
      49, // crash -> Crash Cymbal 1
    ]);
  });

  it("walks the tom candidates for multi-tom kits", () => {
    expect(assignDrumNotes(["tom", "tom", "tom"])).toEqual([45, 47, 50]);
  });

  it("assigns a distinct note to every slot even without a GM analog", () => {
    const notes = assignDrumNotes(
      Array.from({ length: 8 }, (): InstrumentRole => "synth"),
    );
    expect(new Set(notes).size).toBe(8);
    for (const note of notes) {
      expect(note).toBeGreaterThanOrEqual(35);
      expect(note).toBeLessThanOrEqual(81);
    }
  });
});

// -----------------------------------------------------------------------------
// Pattern -> MIDI file
// -----------------------------------------------------------------------------

describe("buildMidiFile", () => {
  it("places one drum-channel track per voice with steps on the 16th grid", () => {
    const options = makeOptions();
    options.pattern.voices[0].variations[0].triggers[0] = true;
    options.pattern.voices[0].variations[0].triggers[4] = true;
    options.pattern.voices[2].variations[0].triggers[8] = true;

    const file = buildMidiFile(options);
    expect(file.ppq).toBe(MIDI_PPQ);
    expect(file.bpm).toBe(100);
    expect(file.tracks).toHaveLength(8);
    for (const track of file.tracks) {
      expect(track.channel).toBe(DRUM_CHANNEL);
    }
    expect(file.tracks[0].name).toBe("Voice 0");

    expect(file.tracks[0].notes.map((note) => note.tick)).toEqual([0, 480]);
    expect(file.tracks[0].notes[0].note).toBe(36);
    expect(file.tracks[2].notes.map((note) => note.tick)).toEqual([960]);
    expect(file.tracks[2].notes[0].note).toBe(38);
    expect(file.tracks[1].notes).toHaveLength(0);
  });

  it("applies the precompute accent math to exported velocities", () => {
    const options = makeOptions();
    const sequence = options.pattern.voices[0].variations[0];
    sequence.triggers[0] = true;
    sequence.velocities[0] = 1.0; // not accented
    sequence.triggers[4] = true;
    sequence.velocities[4] = 1.0; // accented
    sequence.triggers[8] = true;
    sequence.velocities[8] = 0.5; // accented, below the cap
    options.pattern.variationMetadata[0].accent[4] = true;
    options.pattern.variationMetadata[0].accent[8] = true;

    const velocities = buildMidiFile(options).tracks[0].notes.map(
      (note) => note.velocity,
    );

    expect(velocities).toEqual([
      Math.round((1.0 / ACCENT_DAMPEN) * 127), // dampened
      Math.round(Math.min(1, (1.0 / ACCENT_DAMPEN) * ACCENT_BOOST) * 127), // boosted back to full
      Math.round(Math.min(1, (0.5 / ACCENT_DAMPEN) * ACCENT_BOOST) * 127), // unchanged
    ]);
  });

  it("shifts a lane by its timing nudge in 5-tick units, clamping the file start", () => {
    const options = makeOptions();
    options.pattern.voices[0].variations[0].triggers[4] = true;
    options.pattern.voices[0].variations[0].timingNudge = 1;
    expect(ticksForSlot(options, 0)).toEqual([480 + TICKS_PER_NUDGE_UNIT]);

    options.pattern.voices[0].variations[0].timingNudge = -2;
    expect(ticksForSlot(options, 0)).toEqual([480 - 2 * TICKS_PER_NUDGE_UNIT]);

    // A step-0 negative nudge cannot produce a negative tick.
    options.pattern.voices[0].variations[0].triggers[4] = false;
    options.pattern.voices[0].variations[0].triggers[0] = true;
    expect(ticksForSlot(options, 0)).toEqual([0]);
  });

  it("adds a flam grace note before the main hit at reduced velocity", () => {
    const options = makeOptions({ bpm: 100 });
    const sequence = options.pattern.voices[0].variations[0];
    sequence.triggers[4] = true;
    sequence.flams[4] = true;

    const notes = buildMidiFile(options).tracks[0].notes;
    expect(notes).toHaveLength(2);
    const [grace, main] = notes;
    expect(main.tick).toBe(480);
    expect(grace.tick).toBe(480 - flamOffsetTicks(100));
    expect(grace.velocity).toBe(Math.round(FLAM_GRACE_VELOCITY * 127));
    // The grace gate never overlaps the main hit.
    expect(grace.tick + grace.durationTicks).toBeLessThanOrEqual(main.tick);
  });

  it("clamps a step-0 flam grace note to tick 0", () => {
    const options = makeOptions();
    const sequence = options.pattern.voices[0].variations[0];
    sequence.triggers[0] = true;
    sequence.flams[0] = true;

    expect(ticksForSlot(options, 0)).toEqual([0, 0]);
  });

  it("adds a ratchet hit 60 ticks after the main hit at the same velocity", () => {
    const options = makeOptions();
    const sequence = options.pattern.voices[0].variations[0];
    sequence.triggers[4] = true;
    sequence.velocities[4] = 0.5;
    sequence.ratchets[4] = true;

    const notes = buildMidiFile(options).tracks[0].notes;
    expect(notes.map((note) => note.tick)).toEqual([
      480,
      480 + RATCHET_OFFSET_TICKS,
    ]);
    expect(notes[1].velocity).toBe(notes[0].velocity);
  });

  it.runIf(BAKE_SWING_INTO_EXPORT)(
    "bakes swing into offbeat 16ths only",
    () => {
      const options = makeOptions({ swing: TRANSPORT_SWING_MAX });
      const sequence = options.pattern.voices[0].variations[0];
      sequence.triggers[0] = true;
      sequence.triggers[1] = true;
      sequence.triggers[2] = true;

      expect(ticksForSlot(options, 0)).toEqual([0, 120 + 30, 240]);
    },
  );

  it("follows the variation chain across bars, like WAV export", () => {
    const options = makeOptions({
      bars: 4,
      chainEnabled: true,
      chain: {
        steps: [
          { variation: 0, repeats: 1 },
          { variation: 1, repeats: 1 },
        ],
      },
    });
    // Variation A: step 0. Variation B: step 8.
    options.pattern.voices[0].variations[0].triggers[0] = true;
    options.pattern.voices[0].variations[1].triggers[8] = true;

    const barTicks = 16 * TICKS_PER_STEP;
    expect(ticksForSlot(options, 0)).toEqual([
      0, // bar 0: A
      barTicks + 960, // bar 1: B
      2 * barTicks, // bar 2: A (chain wraps)
      3 * barTicks + 960, // bar 3: B
    ]);
  });

  it("honors chain repeats", () => {
    const options = makeOptions({
      bars: 3,
      chainEnabled: true,
      chain: {
        steps: [
          { variation: 0, repeats: 2 },
          { variation: 1, repeats: 1 },
        ],
      },
    });
    options.pattern.voices[0].variations[0].triggers[0] = true;
    options.pattern.voices[0].variations[1].triggers[8] = true;

    const barTicks = 16 * TICKS_PER_STEP;
    expect(ticksForSlot(options, 0)).toEqual([
      0, // bar 0: A
      barTicks, // bar 1: A (repeat)
      2 * barTicks + 960, // bar 2: B
    ]);
  });

  it("repeats the selected variation when the chain is disabled", () => {
    const options = makeOptions({ bars: 2, chainEnabled: false, variation: 1 });
    options.pattern.voices[0].variations[0].triggers[0] = true;
    options.pattern.voices[0].variations[1].triggers[8] = true;

    const barTicks = 16 * TICKS_PER_STEP;
    expect(ticksForSlot(options, 0)).toEqual([960, barTicks + 960]);
  });
});
