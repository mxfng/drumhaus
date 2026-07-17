import { expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Cross-app session sync: drumhaus at / and pulse at /pulse/ in one browser
 * context, jamming over @haus/bridge.
 *
 * SKIPPED until the drumhaus session adapter and its LINK control (issue
 * #417) land on main - that work is in a parallel PR. The body below is
 * written against #417's planned flow (drumhaus joins the session when LINK
 * is toggled on; session bpm <-> transport store, play/stop <-> engine,
 * scene -> variation) so the spec can be enabled by removing the .skip the
 * moment both PRs have merged. Selector details may need a touch-up against
 * the real LINK control.
 */

async function openDrumhaus(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/");
  // Ready when the default kit's sample channels are loaded (mirrors
  // apps/drumhaus/e2e/helpers.ts).
  for (let i = 0; i < 8; i++) {
    await expect(
      page.locator(`[data-instrument-index="${i}"] button`).first(),
    ).toBeEnabled({ timeout: 20_000 });
  }
  return page;
}

async function openPulse(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto("/pulse/");
  await expect(page.getByRole("heading", { name: "pulse" })).toBeVisible();
  return page;
}

test.describe("drumhaus <-> pulse session sync", () => {
  test.skip("tempo, transport, and scene sync both directions once drumhaus is linked", async ({
    context,
  }) => {
    const drumhaus = await openDrumhaus(context);
    const pulse = await openPulse(context);

    // Drumhaus opts into the session (#417's LINK control); pulse is
    // always linked.
    await drumhaus.getByRole("button", { name: /link/i }).click();
    await expect(pulse.getByText("peers 2")).toBeVisible();

    // pulse -> drumhaus: play from pulse starts the drumhaus transport.
    await pulse.getByRole("button", { name: "play", exact: true }).click();
    await expect(
      drumhaus.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();

    // drumhaus -> pulse: stopping from drumhaus stops pulse.
    await drumhaus.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(
      pulse.getByRole("button", { name: "play", exact: true }),
    ).toBeVisible();

    // pulse -> drumhaus: a tempo nudge from pulse reaches drumhaus's bpm
    // control, and both readouts agree.
    await pulse.getByLabel("tempo up").click();
    await expect(pulse.getByLabel("tempo", { exact: true })).toHaveText("121");
    await expect(drumhaus.getByText("121")).toBeVisible();

    // scene both directions: pulse scene 1 selects drumhaus variation B
    // while linked, and a drumhaus variation change lights pulse's
    // indicator (#417 maps scene <-> variation).
    await pulse.getByRole("button", { name: "scene 1", exact: true }).click();
    await expect(
      pulse.getByRole("button", { name: "scene 1", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
