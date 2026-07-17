import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Two pulse tabs in one browser context share a session over @haus/bridge:
 * transport, tempo, and scene sync, and conductorship survives the conductor
 * tab closing. All assertions are on UI state - what an end user sees.
 */

async function openPulse(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/pulse/");
  await expect(page.getByRole("heading", { name: "pulse" })).toBeVisible();
  return page;
}

/** Open two pulse tabs and wait until each has seen the other. */
async function openPair(context: BrowserContext): Promise<[Page, Page]> {
  const a = await openPulse(context);
  const b = await openPulse(context);
  await expect(a.getByText("peers 2")).toBeVisible();
  await expect(b.getByText("peers 2")).toBeVisible();
  return [a, b];
}

function playButton(page: Page) {
  return page.getByRole("button", { name: "play", exact: true });
}

function stopButton(page: Page) {
  return page.getByRole("button", { name: "stop", exact: true });
}

function bpmReadout(page: Page) {
  return page.getByLabel("tempo", { exact: true });
}

function sceneButton(page: Page, scene: number) {
  return page.getByRole("button", { name: `scene ${scene}`, exact: true });
}

function conductorDot(page: Page) {
  return page.locator(".conductor");
}

test.describe("pulse <-> pulse session sync", () => {
  test("play on one tab starts the other, and stop from the other stops both", async ({
    context,
  }) => {
    const [a, b] = await openPair(context);

    await playButton(a).click();
    await expect(stopButton(a)).toBeVisible();
    await expect(stopButton(b)).toBeVisible();

    await stopButton(b).click();
    await expect(playButton(a)).toBeVisible();
    await expect(playButton(b)).toBeVisible();
  });

  test("tempo changes sync in both directions", async ({ context }) => {
    const [a, b] = await openPair(context);

    await expect(bpmReadout(a)).toHaveText("120");
    await expect(bpmReadout(b)).toHaveText("120");

    await a.getByLabel("tempo up").click();
    await a.getByLabel("tempo up").click();
    await expect(bpmReadout(a)).toHaveText("122");
    await expect(bpmReadout(b)).toHaveText("122");

    await b.getByLabel("tempo down").click();
    await expect(bpmReadout(a)).toHaveText("121");
    await expect(bpmReadout(b)).toHaveText("121");
  });

  test("scene clicks sync in both directions", async ({ context }) => {
    const [a, b] = await openPair(context);

    await expect(sceneButton(a, 0)).toHaveAttribute("aria-pressed", "true");
    await expect(sceneButton(b, 0)).toHaveAttribute("aria-pressed", "true");

    await sceneButton(a, 2).click();
    await expect(sceneButton(a, 2)).toHaveAttribute("aria-pressed", "true");
    await expect(sceneButton(b, 2)).toHaveAttribute("aria-pressed", "true");

    await sceneButton(b, 3).click();
    await expect(sceneButton(a, 3)).toHaveAttribute("aria-pressed", "true");
    await expect(sceneButton(b, 3)).toHaveAttribute("aria-pressed", "true");
    await expect(sceneButton(a, 2)).toHaveAttribute("aria-pressed", "false");
  });

  test("closing the conductor tab hands off; state and peers survive", async ({
    context,
  }) => {
    const [a, b] = await openPair(context);

    // The first tab wins the conductor lock; the second follows.
    await expect(conductorDot(a)).toHaveAttribute("data-conductor", "true");
    await expect(conductorDot(b)).toHaveAttribute("data-conductor", "false");

    // Put real session state in place from the conductor.
    await playButton(a).click();
    await a.getByLabel("tempo up").click();
    await a.getByLabel("tempo up").click();
    await a.getByLabel("tempo up").click();
    await sceneButton(a, 1).click();
    await expect(stopButton(b)).toBeVisible();
    await expect(bpmReadout(b)).toHaveText("123");

    await a.close();

    // Web Locks hands conductorship to the survivor; the session state it
    // carries is intact and the departed peer is dropped.
    await expect(conductorDot(b)).toHaveAttribute("data-conductor", "true");
    await expect(stopButton(b)).toBeVisible();
    await expect(bpmReadout(b)).toHaveText("123");
    await expect(sceneButton(b, 1)).toHaveAttribute("aria-pressed", "true");
    await expect(b.getByText("peers 1")).toBeVisible();
  });
});
