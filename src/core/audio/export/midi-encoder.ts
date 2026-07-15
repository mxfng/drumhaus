// --- Standard MIDI File (SMF) encoding utilities for MIDI export ---
//
// Hand-rolled format 1 encoder: one conductor track carrying tempo and time
// signature metadata, followed by one named track per drum voice. Pure
// byte-level encoding only - musical decisions (tick math, note mapping,
// velocities) live in midi-exporter.ts.

import { triggerBlobDownload } from "./download";

/**
 * One note in absolute ticks. The encoder expands this into a note-on /
 * note-off pair and handles delta-time conversion and event ordering.
 */
interface MidiNote {
  /** Absolute position in ticks from the start of the file (>= 0). */
  tick: number;
  /** MIDI note number (0-127). */
  note: number;
  /** Note-on velocity (1-127). */
  velocity: number;
  /** Note length in ticks (>= 1). */
  durationTicks: number;
}

interface MidiTrack {
  /** Track name meta event text (e.g. the instrument's display name). */
  name: string;
  /** MIDI channel (0-15); drum tracks use 9 (channel 10, 1-based). */
  channel: number;
  notes: MidiNote[];
}

interface MidiFile {
  /** Pulses (ticks) per quarter note. */
  ppq: number;
  /** Tempo for the tempo meta event, in beats per minute. */
  bpm: number;
  /** Name written to the conductor track (typically the export filename). */
  name: string;
  tracks: MidiTrack[];
}

// -----------------------------------------------------------------------------
// Low-level byte helpers
// -----------------------------------------------------------------------------

/**
 * Encodes a value as a MIDI variable-length quantity (VLQ): big-endian
 * 7-bit groups, all but the last byte with the continuation bit set.
 */
function encodeVariableLengthQuantity(value: number): number[] {
  const clamped = Math.max(0, Math.floor(value));
  const bytes: number[] = [clamped & 0x7f];
  let remaining = clamped >> 7;
  while (remaining > 0) {
    bytes.unshift((remaining & 0x7f) | 0x80);
    remaining >>= 7;
  }
  return bytes;
}

function pushAscii(bytes: number[], text: string): void {
  for (let i = 0; i < text.length; i++) {
    bytes.push(text.charCodeAt(i) & 0x7f);
  }
}

function pushUint32(bytes: number[], value: number): void {
  bytes.push((value >>> 24) & 0xff);
  bytes.push((value >>> 16) & 0xff);
  bytes.push((value >>> 8) & 0xff);
  bytes.push(value & 0xff);
}

function pushUint16(bytes: number[], value: number): void {
  bytes.push((value >>> 8) & 0xff);
  bytes.push(value & 0xff);
}

/** Track name meta event (FF 03 len text) at delta time 0. */
function pushTrackNameEvent(bytes: number[], name: string): void {
  const text = name.slice(0, 127);
  bytes.push(0x00, 0xff, 0x03, text.length);
  pushAscii(bytes, text);
}

/** End-of-track meta event (FF 2F 00) at delta time 0. */
function pushEndOfTrackEvent(bytes: number[]): void {
  bytes.push(0x00, 0xff, 0x2f, 0x00);
}

/** Wraps finished track event bytes in an MTrk chunk. */
function buildTrackChunk(eventBytes: number[]): number[] {
  const chunk: number[] = [];
  pushAscii(chunk, "MTrk");
  pushUint32(chunk, eventBytes.length);
  return chunk.concat(eventBytes);
}

// -----------------------------------------------------------------------------
// Track encoding
// -----------------------------------------------------------------------------

/**
 * Conductor track: track name, tempo (FF 51), and a 4/4 time signature
 * (FF 58), all at tick 0.
 */
function buildConductorTrack(name: string, bpm: number): number[] {
  const bytes: number[] = [];
  pushTrackNameEvent(bytes, name);

  // Tempo in microseconds per quarter note.
  const microsecondsPerBeat = Math.round(60_000_000 / bpm);
  bytes.push(0x00, 0xff, 0x51, 0x03);
  bytes.push((microsecondsPerBeat >>> 16) & 0xff);
  bytes.push((microsecondsPerBeat >>> 8) & 0xff);
  bytes.push(microsecondsPerBeat & 0xff);

  // Time signature 4/4: numerator 4, denominator 2^2, 24 MIDI clocks per
  // metronome click, 8 32nd notes per quarter.
  bytes.push(0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  pushEndOfTrackEvent(bytes);
  return buildTrackChunk(bytes);
}

/** A note expanded into channel events, before delta conversion. */
type ChannelEvent = {
  tick: number;
  /** Sort key: note-offs precede note-ons at the same tick so back-to-back
   *  same-pitch notes (e.g. a hit followed by its ratchet) never merge. */
  kind: "off" | "on";
  note: number;
  velocity: number;
};

function buildVoiceTrack(track: MidiTrack): number[] {
  const events: ChannelEvent[] = [];
  for (const note of track.notes) {
    const tick = Math.max(0, Math.round(note.tick));
    const durationTicks = Math.max(1, Math.round(note.durationTicks));
    events.push({ tick, kind: "on", note: note.note, velocity: note.velocity });
    events.push({
      tick: tick + durationTicks,
      kind: "off",
      note: note.note,
      velocity: 0,
    });
  }
  events.sort(
    (a, b) =>
      a.tick - b.tick || (a.kind === b.kind ? 0 : a.kind === "off" ? -1 : 1),
  );

  const bytes: number[] = [];
  pushTrackNameEvent(bytes, track.name);

  const channel = track.channel & 0x0f;
  let previousTick = 0;
  for (const event of events) {
    bytes.push(...encodeVariableLengthQuantity(event.tick - previousTick));
    previousTick = event.tick;
    const status = (event.kind === "on" ? 0x90 : 0x80) | channel;
    bytes.push(status, event.note & 0x7f, event.velocity & 0x7f);
  }

  pushEndOfTrackEvent(bytes);
  return buildTrackChunk(bytes);
}

// -----------------------------------------------------------------------------
// File encoding
// -----------------------------------------------------------------------------

/**
 * Encodes a MidiFile to Standard MIDI File format 1 bytes.
 */
function encodeMidi(file: MidiFile): ArrayBuffer {
  const bytes: number[] = [];

  // Header chunk: MThd, length 6, format 1, ntrks, division (PPQ).
  pushAscii(bytes, "MThd");
  pushUint32(bytes, 6);
  pushUint16(bytes, 1); // format 1
  pushUint16(bytes, 1 + file.tracks.length); // conductor + voice tracks
  pushUint16(bytes, file.ppq);

  bytes.push(...buildConductorTrack(file.name, file.bpm));
  for (const track of file.tracks) {
    bytes.push(...buildVoiceTrack(track));
  }

  return Uint8Array.from(bytes).buffer;
}

/**
 * Triggers a browser download of the MIDI file
 */
function downloadMidi(midiBuffer: ArrayBuffer, filename: string): void {
  triggerBlobDownload(midiBuffer, filename, "audio/midi");
}

export { downloadMidi, encodeMidi, encodeVariableLengthQuantity };
export type { MidiFile, MidiNote, MidiTrack };
