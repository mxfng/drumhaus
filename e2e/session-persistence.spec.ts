import { expect, test, type Page } from "@playwright/test";

import { gotoApp, step, toggleStep, waitForAppReady } from "./helpers";

/**
 * Session-document persistence (docs/preset-persistence.md, PR 5): edits
 * autosave into the drumhaus-session envelope and reload through the
 * document pipeline, and the dirty baseline (cleanHash) survives reloads
 * inside the same envelope.
 */

/**
 * The tempo screen's bpm readout: click-to-edit via keyboard. Scoped to the
 * screen value field: the hardware tempo knob is also a slider named "bpm"
 * (it defaults to bpm mode), so the plain role query is ambiguous.
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

test.describe("session persistence across reloads", () => {
  test("edits survive a reload and the session stays dirty", async ({
    page,
  }) => {
    await gotoApp(page);

    // Two distinctive edits: a pattern step and the tempo.
    await toggleStep(page, 0, "true");
    await setBpmViaScreen(page, 128);

    // Reload: the pagehide flush writes the session envelope, boot restores
    // it before first paint.
    await page.reload();
    await waitForAppReady(page);

    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(screenBpm(page)).toContainText("128");

    // The dirty baseline survived the reload too: switching presets still
    // warns about unsaved changes.
    await page.getByRole("combobox", { name: "Preset" }).click();
    await page.getByRole("option", { name: "Amsterdam", exact: true }).click();
    const confirmDialog = page.getByRole("dialog", { name: "Switch Preset?" });
    await expect(confirmDialog).toBeVisible();

    // Cancel keeps the restored session.
    await confirmDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(confirmDialog).not.toBeVisible();
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "init",
    );
  });

  test("a freshly loaded preset stays clean across a reload", async ({
    page,
  }) => {
    await gotoApp(page);

    // Loading a factory preset from a clean session applies immediately.
    await page.getByRole("combobox", { name: "Preset" }).click();
    await page.getByRole("option", { name: "Amsterdam", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "Amsterdam",
    );
    // The preset's kit swap reloads samples; wait for the app to settle so
    // the autosave snapshot is of the fully applied preset.
    await waitForAppReady(page);

    await page.reload();
    await waitForAppReady(page);
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "Amsterdam",
    );

    // Clean survived the reload: switching presets must NOT warn.
    await page.getByRole("combobox", { name: "Preset" }).click();
    await page.getByRole("option", { name: "init", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "init",
    );
    await expect(
      page.getByRole("dialog", { name: "Switch Preset?" }),
    ).toHaveCount(0);
  });
});
