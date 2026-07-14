import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Load the app and wait until it is genuinely interactive:
 * - the default kit's sample channels are loaded (instrument pads enable
 *   once their audio channel is ready), and
 * - the intro lightshow has finished (sequencer step visuals are frozen
 *   until it completes).
 */
async function gotoApp(page: Page): Promise<void> {
  await page.goto("/");
  await waitForChannelsReady(page);
  // The lightshow marks its nodes "done" when the intro wave completes
  // (safety timeout 3s), after which step/selection visuals are live.
  await expect(page.locator('[data-light-node="done"]').first()).toBeAttached({
    timeout: 15_000,
  });
}

/** Wait for all eight instrument channels to finish loading samples. */
async function waitForChannelsReady(page: Page): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await expect(
      page.locator(`[data-instrument-index="${i}"] button`).first(),
    ).toBeEnabled({ timeout: 20_000 });
  }
}

/** The sequencer pad for a step (0-15) of the currently selected voice. */
function step(page: Page, index: number): Locator {
  return page.locator(`button[data-step-index="${index}"]`);
}

/** Toggle a sequencer step and wait for its visual state to flip. */
async function toggleStep(
  page: Page,
  index: number,
  expected: "true" | "false",
): Promise<void> {
  await step(page, index).click();
  await expect(step(page, index)).toHaveAttribute("data-active", expected);
}

/**
 * Index of the sequencer step indicator (playhead) that is currently lit,
 * or -1 when the transport is idle.
 */
function litIndicatorIndex(page: Page): Promise<number> {
  return page.evaluate(() => {
    const indicators = document.querySelectorAll(
      '[data-light-group="sequencer-indicator"]',
    );
    return Array.from(indicators).findIndex((el) =>
      el.classList.contains("bg-primary"),
    );
  });
}

/** Start playback via the transport button and wait for the playhead. */
async function startPlayback(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  // The playhead only lights once the audio context is running and the
  // transport is actually advancing.
  await expect
    .poll(() => litIndicatorIndex(page), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(0);
}

/** Stop playback and wait for the transport to return to idle. */
async function stopPlayback(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect.poll(() => litIndicatorIndex(page)).toBe(-1);
}

export {
  gotoApp,
  litIndicatorIndex,
  startPlayback,
  step,
  stopPlayback,
  toggleStep,
  waitForChannelsReady,
};
