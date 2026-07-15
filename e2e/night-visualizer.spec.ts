import { expect, test } from "@playwright/test";

import { gotoApp, startPlayback, stopPlayback } from "./helpers";

/**
 * Night-mode starfield visualizer (issue #268).
 *
 * The canvas exposes a data-star-glow seam ("silent" | "active") that
 * follows the engine's master output level, written only on state change.
 * Loudness itself is deliberately NOT asserted: browser automation
 * harnesses keep the app's live meters at silence (see the note in
 * kit-swap-chain.browser.test.ts), so a "glow goes active" assertion
 * would be flaky by construction. This spec pins what automation can
 * observe honestly: the starfield mounts with a silent glow, survives a
 * playback start/stop cycle with the seam always in a valid state, and
 * ends silent.
 */
test.describe("night visualizer", () => {
  test("starfield mounts silent and stays coherent across playback", async ({
    page,
  }) => {
    await gotoApp(page);

    // Enable night mode from the floating menu.
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Night Mode" }).click();

    // The starfield mounts with the glow seam silent.
    const sky = page.locator("canvas[data-star-glow]");
    await expect(sky).toHaveAttribute("data-star-glow", "silent");

    // Across a playback cycle the seam only ever holds a valid state.
    await startPlayback(page);
    await expect(sky).toHaveAttribute("data-star-glow", /^(silent|active)$/);
    await stopPlayback(page);

    // After stopping, the glow settles (or stays) silent.
    await expect(sky).toHaveAttribute("data-star-glow", "silent");

    // The canvas survives the cycle without remounting artifacts.
    await expect(sky).toBeAttached();
  });
});
