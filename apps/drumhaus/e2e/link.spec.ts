import { expect, test, type Page } from "@playwright/test";

import {
  gotoApp,
  litIndicatorIndex,
  startPlayback,
  stopPlayback,
  waitForAppReady,
} from "./helpers";

/**
 * The LINK session feature (issue #417): two drumhaus pages in one browser
 * context share a @haus/bridge session over BroadcastChannel + Web Locks
 * (both same-origin, so two pages in one context is exactly the session
 * boundary). Assertions go through UI state: the floating LINK control's
 * data attributes, the transport affordances, and the screen readouts.
 */

const linkControl = (page: Page) =>
  page.getByRole("button", { name: "LINK", exact: true });

/** Opt a page into the session and wait until it reports linked. */
async function enableLink(page: Page): Promise<void> {
  await linkControl(page).click();
  await expect(linkControl(page)).toHaveAttribute("data-linked", "true");
}

/**
 * The tempo screen's bpm readout: click-to-edit via keyboard. Scoped to the
 * screen value field: the hardware tempo knob is also a slider named "bpm".
 */
const screenBpm = (page: Page) =>
  page.locator('[data-slot="value-field"][aria-label="bpm"]');

async function setBpmViaScreen(page: Page, bpm: number): Promise<void> {
  const bpmControl = screenBpm(page);
  await bpmControl.press("Enter");
  const input = bpmControl.locator("input");
  await input.fill(String(bpm));
  await input.press("Enter");
  await expect(bpmControl).toContainText(String(bpm));
}

/** A variation pad (A-D) in the pattern module. */
const variationPad = (page: Page, label: "A" | "B" | "C" | "D") =>
  page.getByRole("button", { name: label, exact: true });

/** The selected variation pad carries the active border. */
async function expectVariationSelected(
  page: Page,
  label: "A" | "B" | "C" | "D",
): Promise<void> {
  await expect(variationPad(page, label)).toHaveClass(/border-primary/);
}

async function openTwoPages(page: Page): Promise<Page> {
  await gotoApp(page);
  const pageB = await page.context().newPage();
  await pageB.goto("/");
  await waitForAppReady(pageB);
  return pageB;
}

test.describe("session link", () => {
  test("linked tabs share tempo changes in both directions", async ({
    page,
  }) => {
    const pageB = await openTwoPages(page);

    await enableLink(page);
    await enableLink(pageB);

    // Both tabs see one other peer; exactly one conducts.
    await expect(linkControl(page)).toHaveAttribute("data-peers", "1");
    await expect(linkControl(pageB)).toHaveAttribute("data-peers", "1");
    await expect(linkControl(page)).toHaveAttribute("data-conductor", "true");
    await expect(linkControl(pageB)).toHaveAttribute("data-conductor", "false");

    // Conductor -> follower.
    await setBpmViaScreen(page, 140);
    await expect(screenBpm(pageB)).toContainText("140");

    // Follower -> conductor (an intent round-trip).
    await setBpmViaScreen(pageB, 96);
    await expect(screenBpm(page)).toContainText("96");
  });

  test("play on one tab starts both; stop on the other stops both", async ({
    page,
  }) => {
    const pageB = await openTwoPages(page);

    await enableLink(page);
    await enableLink(pageB);
    await expect(linkControl(page)).toHaveAttribute("data-peers", "1");

    // Play on A: both transports run (the playhead only advances once the
    // audio clock does, so this asserts real playback on both pages).
    await startPlayback(page);
    await expect(
      pageB.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => litIndicatorIndex(pageB), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(0);

    // Stop from B (the follower posts a stop intent): both go idle.
    await stopPlayback(pageB);
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    await expect.poll(() => litIndicatorIndex(page)).toBe(-1);
  });

  test("variation pads sync through the session scene", async ({ page }) => {
    const pageB = await openTwoPages(page);

    await enableLink(page);
    await enableLink(pageB);
    await expect(linkControl(page)).toHaveAttribute("data-peers", "1");

    // Follower pad -> conductor selection.
    await variationPad(pageB, "B").click();
    await expectVariationSelected(pageB, "B");
    await expectVariationSelected(page, "B");

    // Conductor pad -> follower selection.
    await variationPad(page, "D").click();
    await expectVariationSelected(page, "D");
    await expectVariationSelected(pageB, "D");
  });

  test("closing the conductor hands conductorship over and state survives", async ({
    page,
  }) => {
    const pageB = await openTwoPages(page);

    // A links first and conducts.
    await enableLink(page);
    await enableLink(pageB);
    await expect(linkControl(page)).toHaveAttribute("data-conductor", "true");

    await setBpmViaScreen(page, 132);
    await expect(screenBpm(pageB)).toContainText("132");

    // Closing A releases the conductor lock; B takes over with the state
    // intact and stays linked.
    await page.close();
    await expect(linkControl(pageB)).toHaveAttribute("data-conductor", "true");
    await expect(linkControl(pageB)).toHaveAttribute("data-linked", "true");
    await expect(linkControl(pageB)).toHaveAttribute("data-peers", "0");
    await expect(screenBpm(pageB)).toContainText("132");
  });

  test("re-linking after unlink joins from the current local state", async ({
    page,
  }) => {
    const pageB = await openTwoPages(page);

    await enableLink(page);
    await enableLink(pageB);
    await expect(linkControl(page)).toHaveAttribute("data-peers", "1");

    // Play while linked: both transports run.
    await startPlayback(page);
    await expect(
      pageB.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();

    // A leaves the session; its local playback keeps running.
    await linkControl(page).click();
    await expect(linkControl(page)).toHaveAttribute("data-linked", "false");
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();

    // Stop everywhere: A locally, B (still linked) through the session.
    await stopPlayback(page);
    await stopPlayback(pageB);

    // Re-link A: the fresh join must not resurrect the previous period's
    // playing grid - both pages stay stopped.
    await enableLink(page);
    await expect(linkControl(page)).toHaveAttribute("data-peers", "1");
    await page.waitForTimeout(500);
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    await expect(
      pageB.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    expect(await litIndicatorIndex(page)).toBe(-1);
    expect(await litIndicatorIndex(pageB)).toBe(-1);
  });

  test("an unlinked tab is never affected by (and never affects) the session", async ({
    page,
  }) => {
    const pageB = await openTwoPages(page);

    // Only A opts in. B stays fully local.
    await enableLink(page);
    await expect(linkControl(pageB)).toHaveAttribute("data-linked", "false");

    // A's tempo change stays on A.
    await setBpmViaScreen(page, 150);
    await expect(screenBpm(pageB)).toContainText("100");

    // B's tempo change stays on B.
    await setBpmViaScreen(pageB, 80);
    await expect(screenBpm(page)).toContainText("150");

    // A's playback does not start B.
    await startPlayback(page);
    await page.waitForTimeout(500);
    await expect(
      pageB.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();
    expect(await litIndicatorIndex(pageB)).toBe(-1);

    await stopPlayback(page);
  });
});
