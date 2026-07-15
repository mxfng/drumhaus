import { describe, expect, it } from "vitest";

import {
  encodeMidi,
  encodeVariableLengthQuantity,
  type MidiFile,
} from "./midi-encoder";

// -----------------------------------------------------------------------------
// Minimal SMF reader (covers exactly what the encoder emits)
// -----------------------------------------------------------------------------

interface ParsedEvent {
  deltaTicks: number;
  /** "meta" for FF events, otherwise "on" / "off". */
  kind: "meta" | "on" | "off";
  /** Meta type byte for meta events. */
  metaType?: number;
  data: number[];
  channel?: number;
}

interface ParsedTrack {
  events: ParsedEvent[];
}

interface ParsedMidi {
  format: number;
  trackCount: number;
  division: number;
  tracks: ParsedTrack[];
}

function readVariableLengthQuantity(
  bytes: Uint8Array,
  offset: number,
): { value: number; next: number } {
  let value = 0;
  let next = offset;
  for (;;) {
    const byte = bytes[next++];
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) break;
  }
  return { value, next };
}

function parseMidi(buffer: ArrayBuffer): ParsedMidi {
  const bytes = new Uint8Array(buffer);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  const uint32 = (start: number) =>
    (bytes[start] << 24) |
    (bytes[start + 1] << 16) |
    (bytes[start + 2] << 8) |
    bytes[start + 3];
  const uint16 = (start: number) => (bytes[start] << 8) | bytes[start + 1];

  expect(ascii(0, 4)).toBe("MThd");
  expect(uint32(4)).toBe(6);
  const format = uint16(8);
  const trackCount = uint16(10);
  const division = uint16(12);

  const tracks: ParsedTrack[] = [];
  let offset = 14;
  while (offset < bytes.length) {
    expect(ascii(offset, 4)).toBe("MTrk");
    const chunkLength = uint32(offset + 4);
    let cursor = offset + 8;
    const end = cursor + chunkLength;
    const events: ParsedEvent[] = [];

    while (cursor < end) {
      const delta = readVariableLengthQuantity(bytes, cursor);
      cursor = delta.next;
      const status = bytes[cursor++];

      if (status === 0xff) {
        const metaType = bytes[cursor++];
        const length = readVariableLengthQuantity(bytes, cursor);
        cursor = length.next;
        events.push({
          deltaTicks: delta.value,
          kind: "meta",
          metaType,
          data: Array.from(bytes.slice(cursor, cursor + length.value)),
        });
        cursor += length.value;
      } else {
        const type = status & 0xf0;
        expect([0x80, 0x90]).toContain(type);
        events.push({
          deltaTicks: delta.value,
          kind: type === 0x90 ? "on" : "off",
          channel: status & 0x0f,
          data: [bytes[cursor], bytes[cursor + 1]],
        });
        cursor += 2;
      }
    }

    expect(cursor).toBe(end);
    tracks.push({ events });
    offset = end;
  }

  expect(tracks).toHaveLength(trackCount);
  return { format, trackCount, division, tracks };
}

function noteEvents(track: ParsedTrack): ParsedEvent[] {
  return track.events.filter((event) => event.kind !== "meta");
}

// -----------------------------------------------------------------------------
// Variable-length quantities
// -----------------------------------------------------------------------------

describe("encodeVariableLengthQuantity", () => {
  it("encodes the SMF specification's reference vectors", () => {
    expect(encodeVariableLengthQuantity(0x00)).toEqual([0x00]);
    expect(encodeVariableLengthQuantity(0x40)).toEqual([0x40]);
    expect(encodeVariableLengthQuantity(0x7f)).toEqual([0x7f]);
    expect(encodeVariableLengthQuantity(0x80)).toEqual([0x81, 0x00]);
    expect(encodeVariableLengthQuantity(0x2000)).toEqual([0xc0, 0x00]);
    expect(encodeVariableLengthQuantity(0x3fff)).toEqual([0xff, 0x7f]);
    expect(encodeVariableLengthQuantity(0x4000)).toEqual([0x81, 0x80, 0x00]);
    expect(encodeVariableLengthQuantity(0xfffffff)).toEqual([
      0xff, 0xff, 0xff, 0x7f,
    ]);
  });

  it("encodes typical tick deltas at PPQ 480", () => {
    expect(encodeVariableLengthQuantity(120)).toEqual([0x78]); // one 16th
    expect(encodeVariableLengthQuantity(480)).toEqual([0x83, 0x60]); // one beat
  });

  it("round-trips through the reader", () => {
    for (const value of [0, 1, 127, 128, 500, 100_000, 0xfffffff]) {
      const encoded = Uint8Array.from(encodeVariableLengthQuantity(value));
      expect(readVariableLengthQuantity(encoded, 0).value).toBe(value);
    }
  });
});

// -----------------------------------------------------------------------------
// File encoding
// -----------------------------------------------------------------------------

function makeFile(overrides: Partial<MidiFile> = {}): MidiFile {
  return {
    ppq: 480,
    bpm: 120,
    name: "test-export",
    tracks: [],
    ...overrides,
  };
}

describe("encodeMidi", () => {
  it("writes a format 1 header with PPQ division and conductor track", () => {
    const parsed = parseMidi(
      encodeMidi(
        makeFile({
          tracks: [
            { name: "Kick", channel: 9, notes: [] },
            { name: "Snare", channel: 9, notes: [] },
          ],
        }),
      ),
    );

    expect(parsed.format).toBe(1);
    expect(parsed.trackCount).toBe(3); // conductor + 2 voices
    expect(parsed.division).toBe(480);
  });

  it("writes tempo, time signature, and names to the conductor track", () => {
    const parsed = parseMidi(encodeMidi(makeFile({ bpm: 100 })));
    const conductor = parsed.tracks[0];

    const name = conductor.events.find((event) => event.metaType === 0x03);
    expect(name?.data.map((c) => String.fromCharCode(c)).join("")).toBe(
      "test-export",
    );

    // 100 BPM -> 600,000 microseconds per beat -> 0x09 0x27 0xC0.
    const tempo = conductor.events.find((event) => event.metaType === 0x51);
    expect(tempo?.data).toEqual([0x09, 0x27, 0xc0]);

    // 4/4, 24 clocks per click, 8 32nds per quarter.
    const timeSignature = conductor.events.find(
      (event) => event.metaType === 0x58,
    );
    expect(timeSignature?.data).toEqual([0x04, 0x02, 0x18, 0x08]);

    const endOfTrack = conductor.events[conductor.events.length - 1];
    expect(endOfTrack?.metaType).toBe(0x2f);
  });

  it("encodes a note as a delta-timed on/off pair on the track's channel", () => {
    const parsed = parseMidi(
      encodeMidi(
        makeFile({
          tracks: [
            {
              name: "Kick",
              channel: 9,
              notes: [
                { tick: 120, note: 36, velocity: 100, durationTicks: 60 },
              ],
            },
          ],
        }),
      ),
    );

    const events = noteEvents(parsed.tracks[1]);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      deltaTicks: 120,
      kind: "on",
      channel: 9,
      data: [36, 100],
    });
    expect(events[1]).toMatchObject({
      deltaTicks: 60,
      kind: "off",
      channel: 9,
      data: [36, 0],
    });
  });

  it("orders a note-off before a coinciding note-on so ratchets never merge", () => {
    const parsed = parseMidi(
      encodeMidi(
        makeFile({
          tracks: [
            {
              name: "Snare",
              channel: 9,
              notes: [
                { tick: 0, note: 38, velocity: 90, durationTicks: 60 },
                { tick: 60, note: 38, velocity: 90, durationTicks: 60 },
              ],
            },
          ],
        }),
      ),
    );

    const events = noteEvents(parsed.tracks[1]);
    expect(events.map((event) => event.kind)).toEqual([
      "on",
      "off",
      "on",
      "off",
    ]);
    expect(events.map((event) => event.deltaTicks)).toEqual([0, 60, 0, 60]);
  });

  it("names voice tracks after their instruments", () => {
    const parsed = parseMidi(
      encodeMidi(
        makeFile({
          tracks: [
            { name: "OHat", channel: 9, notes: [] },
            { name: "Clap", channel: 9, notes: [] },
          ],
        }),
      ),
    );

    const names = parsed.tracks.slice(1).map((track) =>
      track.events
        .find((event) => event.metaType === 0x03)
        ?.data.map((c) => String.fromCharCode(c))
        .join(""),
    );
    expect(names).toEqual(["OHat", "Clap"]);
  });
});
