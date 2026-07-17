import { expect, test } from "@playwright/test";

import { gotoApp, startPlayback, stopPlayback, toggleStep } from "./helpers";

/**
 * Night-mode starfield visualizer (issue #268).
 *
 * The canvas exposes a data-star-glow seam ("silent" | "active") that
 * follows the engine's master output level, written only on state change.
 *
 * Loudness IS asserted here: automation boots a fresh profile, so the app
 * lands on the empty init preset - the spec builds a beat first, and the
 * glow must then go active during playback (issue #348: the old belief
 * that automation harnesses keep live meters at silence was the empty
 * init pattern playing nothing, not an environment limit).
 */
test.describe("night visualizer", () => {
  test("starfield glow follows playback loudness", async ({ page }) => {
    await gotoApp(page);

    // Fresh profiles boot on the empty init preset; give the default
    // voice a four-on-the-floor beat so playback is audible.
    for (const index of [0, 4, 8, 12]) {
      await toggleStep(page, index, "true");
    }

    // Enable night mode from the floating menu.
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Night Mode" }).click();

    // The starfield mounts with the glow seam silent.
    const sky = page.locator("canvas[data-star-glow]");
    await expect(sky).toHaveAttribute("data-star-glow", "silent");

    // During playback the loudness-coupled glow activates.
    await startPlayback(page);
    await expect(sky).toHaveAttribute("data-star-glow", "active");

    // After stopping, the glow settles back to silent.
    await stopPlayback(page);
    await expect(sky).toHaveAttribute("data-star-glow", "silent");

    // The canvas survives the cycle without remounting artifacts.
    await expect(sky).toBeAttached();
  });
});
