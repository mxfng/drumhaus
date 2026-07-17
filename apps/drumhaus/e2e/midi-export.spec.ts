import fs from "node:fs";
import { expect, test } from "@playwright/test";

import { gotoApp, toggleStep } from "./helpers";

interface MidiNoteOn {
  tick: number;
  channel: number;
  note: number;
  velocity: number;
}

interface MidiTrackInfo {
  name: string;
  noteOns: MidiNoteOn[];
}

interface MidiInfo {
  format: number;
  trackCount: number;
  division: number;
  bpm: number;
  tracks: MidiTrackInfo[];
}

/** Minimal SMF reader: validates the header and walks every track chunk. */
function parseMidi(buffer: Buffer): MidiInfo {
  expect(buffer.length).toBeGreaterThan(14);
  expect(buffer.toString("ascii", 0, 4)).toBe("MThd");
  expect(buffer.readUInt32BE(4)).toBe(6);

  const format = buffer.readUInt16BE(8);
  const trackCount = buffer.readUInt16BE(10);
  const division = buffer.readUInt16BE(12);

  const readVarLen = (offset: number): { value: number; next: number } => {
    let value = 0;
    let next = offset;
    for (;;) {
      const byte = buffer[next++];
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) break;
    }
    return { value, next };
  };

  let bpm = 0;
  const tracks: MidiTrackInfo[] = [];
  let offset = 14;

  while (offset < buffer.length) {
    expect(buffer.toString("ascii", offset, offset + 4)).toBe("MTrk");
    const chunkLength = buffer.readUInt32BE(offset + 4);
    let cursor = offset + 8;
    const end = cursor + chunkLength;

    let tick = 0;
    let name = "";
    const noteOns: MidiNoteOn[] = [];

    while (cursor < end) {
      const delta = readVarLen(cursor);
      cursor = delta.next;
      tick += delta.value;
      const status = buffer[cursor++];

      if (status === 0xff) {
        const metaType = buffer[cursor++];
        const length = readVarLen(cursor);
        cursor = length.next;
        if (metaType === 0x03) {
          name = buffer.toString("ascii", cursor, cursor + length.value);
        } else if (metaType === 0x51) {
          const microsecondsPerBeat =
            (buffer[cursor] << 16) |
            (buffer[cursor + 1] << 8) |
            buffer[cursor + 2];
          bpm = 60_000_000 / microsecondsPerBeat;
        }
        cursor += length.value;
      } else {
        const type = status & 0xf0;
        expect([0x80, 0x90]).toContain(type);
        const note = buffer[cursor];
        const velocity = buffer[cursor + 1];
        cursor += 2;
        if (type === 0x90 && velocity > 0) {
          noteOns.push({ tick, channel: status & 0x0f, note, velocity });
        }
      }
    }

    expect(cursor).toBe(end);
    tracks.push({ name, noteOns });
    offset = end;
  }

  expect(tracks).toHaveLength(trackCount);
  return { format, trackCount, division, bpm, tracks };
}

test.describe("MIDI export", () => {
  test("exports the pattern as a valid MIDI download", async ({ page }) => {
    await gotoApp(page);

    // Put steps 0 and 8 into the kick lane (voice 0 is selected by default).
    await toggleStep(page, 0, "true");
    await toggleStep(page, 8, "true");

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Export" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("tab", { name: "MIDI" }).click();
    await dialog.getByLabel("Filename").fill("e2e-midi-export");

    const downloadPromise = page.waitForEvent("download", {
      timeout: 30_000,
    });
    await dialog.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("e2e-midi-export.mid");

    const path = await download.path();
    const midi = parseMidi(fs.readFileSync(path));

    // SMF format 1 at PPQ 480: a conductor track plus one track per voice.
    expect(midi.format).toBe(1);
    expect(midi.trackCount).toBe(9);
    expect(midi.division).toBe(480);
    expect(midi.tracks[0].name).toBe("e2e-midi-export");

    // The tempo meta event carries the transport BPM.
    expect(midi.bpm).toBeGreaterThanOrEqual(40);
    expect(midi.bpm).toBeLessThanOrEqual(300);

    // The kick lane holds the toggled steps: steps 0 and 8 of each of the
    // two exported bars (one bar is 16 steps * 120 ticks), on GM note 36
    // (Bass Drum 1), channel 10, at full velocity.
    const kick = midi.tracks[1];
    expect(kick.noteOns.map((event) => event.tick)).toEqual([
      0, 960, 1920, 2880,
    ]);
    for (const event of kick.noteOns) {
      expect(event.channel).toBe(9);
      expect(event.note).toBe(36);
      expect(event.velocity).toBe(127);
    }

    // No other lane picked up notes.
    for (const track of midi.tracks.slice(2)) {
      expect(track.noteOns).toHaveLength(0);
    }

    // The dialog closes and the app confirms the export.
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText("Export successful", { exact: true }),
    ).toBeVisible();
  });
});
