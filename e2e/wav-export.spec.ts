import fs from "node:fs";
import { expect, test } from "@playwright/test";

import { gotoApp, toggleStep } from "./helpers";

interface WavInfo {
  sampleRate: number;
  channels: number;
  duration: number;
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
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  expect(sampleRate).toBeGreaterThan(0);
  expect(channels).toBeGreaterThan(0);
  expect(byteRate).toBeGreaterThan(0);
  expect(dataSize).toBeGreaterThan(0);

  return { sampleRate, channels, duration: dataSize / byteRate };
}

test.describe("WAV export", () => {
  test("exports the pattern as a valid WAV download", async ({ page }) => {
    await gotoApp(page);

    // Put something in the pattern so the render isn't trivially empty.
    await toggleStep(page, 0, "true");
    await toggleStep(page, 8, "true");

    await page.getByRole("button", { name: "Export", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Export" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("tab", { name: "WAV" }).click();
    await dialog.getByLabel("Filename").fill("e2e-export");

    // The form displays the expected render duration, e.g. "4.0s".
    const durationText = await dialog
      .getByText(/^\d+\.\ds$/)
      .first()
      .innerText();
    const expectedDuration = Number.parseFloat(durationText);
    expect(expectedDuration).toBeGreaterThan(0);

    // Submitting renders offline and triggers a browser download.
    const downloadPromise = page.waitForEvent("download", {
      timeout: 45_000,
    });
    await dialog.getByRole("button", { name: "Export", exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("e2e-export.wav");

    const path = await download.path();
    const wav = fs.readFileSync(path);

    // Non-trivial payload with a valid RIFF/WAVE header.
    expect(wav.length).toBeGreaterThan(100_000);
    const info = parseWav(wav);

    // The rendered duration matches what the export form promised.
    expect(Math.abs(info.duration - expectedDuration)).toBeLessThan(0.25);

    // The dialog closes and the app confirms the export.
    await expect(dialog).not.toBeVisible();
    // exact: true dodges the duplicate text inside the toast's aria-live
    // announcement span.
    await expect(
      page.getByText("Export successful", { exact: true }),
    ).toBeVisible();
  });
});
