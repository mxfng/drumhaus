import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Cross-app session sync: drumhaus at / and pulse at /pulse/ in one browser
 * context, jamming over @haus/bridge. Pulse joins the session on load;
 * drumhaus opts in through its floating LINK control (issue #417). All
 * assertions are on UI state - what an end user sees in each app.
 */

// --- drumhaus ---

async function openDrumhaus(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/");
  // Ready when the default kit's sample channels are loaded and the intro
  // lightshow has finished (mirrors apps/drumhaus/e2e/helpers.ts).
  for (let i = 0; i < 8; i++) {
    await expect(
      page.locator(`[data-instrument-index="${i}"] button`).first(),
    ).toBeEnabled({ timeout: 20_000 });
  }
  await expect(page.locator('[data-light-node="done"]').first()).toBeAttached({
    timeout: 15_000,
  });
  return page;
}

const linkControl = (page: Page) =>
  page.getByRole("button", { name: "LINK", exact: true });

/** Opt a drumhaus page into the session and wait until it reports linked. */
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

/**
 * Index of the sequencer step indicator (playhead) that is currently lit,
 * or -1 when the transport is idle. Only advances once the audio clock
 * runs, so it asserts real playback rather than button state.
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

// --- pulse ---

async function openPulse(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/pulse/");
  await expect(page.getByRole("heading", { name: "pulse" })).toBeVisible();
  return page;
}

const pulsePlay = (page: Page) =>
  page.getByRole("button", { name: "play", exact: true });
const pulseStop = (page: Page) =>
  page.getByRole("button", { name: "stop", exact: true });
const pulseBpm = (page: Page) => page.getByLabel("tempo", { exact: true });
const pulseScene = (page: Page, scene: number) =>
  page.getByRole("button", { name: `scene ${scene}`, exact: true });
const pulseConductorDot = (page: Page) => page.locator(".conductor");

test.describe("drumhaus <-> pulse session sync", () => {
  test("tempo, transport, and scene sync both directions once drumhaus is linked", async ({
    context,
  }) => {
    const drumhaus = await openDrumhaus(context);
    const pulse = await openPulse(context);

    // Pulse joined on load and, alone in the session, conducts it at the
    // protocol default 120. Drumhaus opts in and adopts the conductor's
    // state (its local default is 100).
    await enableLink(drumhaus);
    await expect(pulse.getByText("peers 2")).toBeVisible();
    await expect(linkControl(drumhaus)).toHaveAttribute("data-peers", "1");
    await expect(pulseConductorDot(pulse)).toHaveAttribute(
      "data-conductor",
      "true",
    );
    await expect(linkControl(drumhaus)).toHaveAttribute(
      "data-conductor",
      "false",
    );
    await expect(screenBpm(drumhaus)).toContainText("120");

    // pulse -> drumhaus: play from pulse starts the drumhaus transport for
    // real (the playhead only advances once the audio clock does).
    await pulsePlay(pulse).click();
    await expect(
      drumhaus.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => litIndicatorIndex(drumhaus), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(0);

    // drumhaus -> pulse: stopping from drumhaus stops pulse.
    await drumhaus.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(pulsePlay(pulse)).toBeVisible();
    await expect.poll(() => litIndicatorIndex(drumhaus)).toBe(-1);

    // pulse -> drumhaus: a tempo nudge from pulse reaches drumhaus's screen
    // readout, and both agree.
    await pulse.getByLabel("tempo up").click();
    await expect(pulseBpm(pulse)).toHaveText("121");
    await expect(screenBpm(drumhaus)).toContainText("121");

    // drumhaus -> pulse: a bpm edit on the drumhaus screen reaches pulse
    // (an intent round-trip through the pulse conductor).
    await setBpmViaScreen(drumhaus, 96);
    await expect(pulseBpm(pulse)).toHaveText("96");

    // pulse -> drumhaus: scene 1 selects variation B while linked.
    await pulseScene(pulse, 1).click();
    await expect(pulseScene(pulse, 1)).toHaveAttribute("aria-pressed", "true");
    await expect(variationPad(drumhaus, "B")).toHaveClass(/border-primary/);

    // drumhaus -> pulse: variation D lights pulse's scene 3.
    await variationPad(drumhaus, "D").click();
    await expect(variationPad(drumhaus, "D")).toHaveClass(/border-primary/);
    await expect(pulseScene(pulse, 3)).toHaveAttribute("aria-pressed", "true");
    await expect(pulseScene(pulse, 1)).toHaveAttribute("aria-pressed", "false");
  });

  test("conductorship hands off from drumhaus to pulse with state intact", async ({
    context,
  }) => {
    // Drumhaus links while alone, so it conducts; pulse joins as follower.
    const drumhaus = await openDrumhaus(context);
    await enableLink(drumhaus);
    await expect(linkControl(drumhaus)).toHaveAttribute(
      "data-conductor",
      "true",
    );

    const pulse = await openPulse(context);
    await expect(linkControl(drumhaus)).toHaveAttribute("data-peers", "1");
    await expect(pulseConductorDot(pulse)).toHaveAttribute(
      "data-conductor",
      "false",
    );

    // The drumhaus conductor's seeded state (its local default bpm 100)
    // is the session state; put a distinctive tempo in place.
    await expect(pulseBpm(pulse)).toHaveText("100");
    await setBpmViaScreen(drumhaus, 132);
    await expect(pulseBpm(pulse)).toHaveText("132");

    // Closing drumhaus releases the conductor lock; pulse takes over with
    // the state intact and the departed peer dropped.
    await drumhaus.close();
    await expect(pulseConductorDot(pulse)).toHaveAttribute(
      "data-conductor",
      "true",
    );
    await expect(pulseBpm(pulse)).toHaveText("132");
    await expect(pulse.getByText("peers 1")).toBeVisible();

    // The surviving conductor still applies commands.
    await pulse.getByLabel("tempo up").click();
    await expect(pulseBpm(pulse)).toHaveText("133");
  });
});
