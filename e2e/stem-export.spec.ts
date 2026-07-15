import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";

import { gotoApp, toggleStep } from "./helpers";

interface WavInfo {
  sampleRate: number;
  channels: number;
  duration: number;
  /** Peak |sample| of the 16-bit PCM payload, normalized to 0..1. */
  peak: number;
}

/** Minimal RIFF/WAVE reader: validates the header and walks the chunks. */
function parseWav(buffer: Buffer): WavInfo {
  expect(buffer.length).toBeGreaterThan(44);
  expect(buffer.toString("ascii", 0, 4)).toBe("RIFF");
  expect(buffer.toString("ascii", 8, 12)).toBe("WAVE");

  let sampleRate = 0;
  let channels = 0;
  let byteRate = 0;
  let dataSize = 0;
  let dataOffset = 0;

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === "fmt ") {
      channels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      byteRate = buffer.readUInt32LE(offset + 16);
    } else if (chunkId === "data") {
      dataSize = chunkSize;
      dataOffset = offset + 8;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  expect(sampleRate).toBeGreaterThan(0);
  expect(channels).toBeGreaterThan(0);
  expect(byteRate).toBeGreaterThan(0);
  expect(dataSize).toBeGreaterThan(0);

  let peak = 0;
  const end = Math.min(dataOffset + dataSize, buffer.length);
  for (let i = dataOffset; i + 1 < end; i += 2) {
    peak = Math.max(peak, Math.abs(buffer.readInt16LE(i)));
  }

  return {
    sampleRate,
    channels,
    duration: dataSize / byteRate,
    peak: peak / 0x8000,
  };
}

test.describe("stem export", () => {
  test("exports pre-master stems as a valid zip download", async ({ page }) => {
    await gotoApp(page);

    // Put steps into two lanes: kick (voice 0, selected by default) and
    // snare (voice 3 on the default kit, selected via its digit key).
    await toggleStep(page, 0, "true");
    await toggleStep(page, 8, "true");
    await page.keyboard.press("3");
    await expect(
      page.locator("[data-instrument-index][data-selected]"),
    ).toHaveAttribute("data-instrument-index", "2");
    await toggleStep(page, 4, "true");

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Export" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("tab", { name: "Stems" }).click();
    await dialog.getByLabel("Filename").fill("e2e-stems");

    // The form displays the expected per-file render duration, e.g. "4.8s".
    const durationText = await dialog
      .getByText(/^\d+\.\ds$/)
      .first()
      .innerText();
    const expectedDuration = Number.parseFloat(durationText);
    expect(expectedDuration).toBeGreaterThan(0);

    // Submitting renders each stem offline and downloads one zip.
    const downloadPromise = page.waitForEvent("download", {
      timeout: 45_000,
    });
    await dialog.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("e2e-stems-stems.zip");

    const path = await download.path();
    const entries = unzipSync(new Uint8Array(fs.readFileSync(path)));

    // Empty-lane policy: lanes without triggers are skipped, so the pack
    // holds exactly the README, the full mix, and the two played stems
    // (default kit slot names: Kick, Kick2, Snare, Clap, Hat, OHat, Tom,
    // Tom2; slot numbering is 1-based in slot order).
    expect(Object.keys(entries).sort()).toEqual([
      "00-full-mix.wav",
      "01-kick.wav",
      "03-snare.wav",
      "README.txt",
    ]);

    // The README states the pre-master contract and lists skipped lanes.
    const readme = Buffer.from(entries["README.txt"]).toString("utf-8");
    expect(readme).toContain("PRE-MASTER");
    expect(readme).toContain("Skipped (would have rendered silence):");
    for (const skipped of [
      "02-kick2.wav",
      "04-clap.wav",
      "05-hat.wav",
      "06-ohat.wav",
      "07-tom.wav",
      "08-tom2.wav",
    ]) {
      expect(readme).toContain(`${skipped} (no triggers in the exported bars)`);
    }

    // Every WAV parses, matches the promised duration, and the toggled
    // lanes carry real audio.
    for (const name of ["00-full-mix.wav", "01-kick.wav", "03-snare.wav"]) {
      const info = parseWav(Buffer.from(entries[name]));
      expect(Math.abs(info.duration - expectedDuration)).toBeLessThan(0.25);
      expect(info.peak).toBeGreaterThan(0.05);
    }

    // The dialog closes and the app confirms the export, naming the
    // skipped lanes.
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText("Export successful", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Skipped silent lanes: .*Kick2/).first(),
    ).toBeVisible();
  });
});
