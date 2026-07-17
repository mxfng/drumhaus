import { expect, test } from "@playwright/test";

import { gotoApp, step, toggleStep } from "./helpers";

test.describe("preset save and load", () => {
  test("loading a saved preset reverts later edits", async ({ page }) => {
    await gotoApp(page);

    // Make a change worth saving: turn step 1 on.
    await toggleStep(page, 0, "true");

    // Saving from a factory preset opens the Save As dialog.
    await page.getByRole("button", { name: "Save preset" }).click();
    const saveDialog = page.getByRole("dialog", { name: "Save Preset" });
    await expect(saveDialog).toBeVisible();
    await saveDialog.getByLabel("Preset name").fill("E2E Preset");
    await saveDialog.getByRole("button", { name: "Save" }).click();
    await expect(saveDialog).not.toBeVisible();

    // The saved preset becomes the current one.
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "E2E Preset",
    );

    // Modify the pattern after saving.
    await toggleStep(page, 8, "true");

    // Switching away with unsaved changes prompts for confirmation.
    await page.getByRole("combobox", { name: "Preset" }).click();
    await page.getByRole("option", { name: "init", exact: true }).click();
    const confirmDialog = page.getByRole("dialog", { name: "Switch Preset?" });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Switch Anyway" }).click();

    // init's empty pattern is back.
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "init",
    );
    await expect(step(page, 0)).toHaveAttribute("data-active", "false");

    // Load the saved preset again: the saved step is restored and the
    // post-save modification is gone.
    await page.getByRole("combobox", { name: "Preset" }).click();
    await page.getByRole("option", { name: "E2E Preset", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "E2E Preset",
    );
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(step(page, 8)).toHaveAttribute("data-active", "false");
  });
});
