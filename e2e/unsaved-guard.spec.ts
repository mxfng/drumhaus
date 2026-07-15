import { expect, test, type Page } from "@playwright/test";

import { gotoApp, step, toggleStep, waitForChannelsReady } from "./helpers";

/**
 * Unsaved-changes guards on the file-import and share-link ingresses
 * (docs/preset-persistence.md, PR 5: "extend unsaved-changes checks to file
 * import and share-link loads"): a dirty session defers the load behind the
 * same confirm flow the library switch has always had; confirm applies the
 * preset, cancel keeps the session.
 */

/**
 * Export the current state as a .dh file named `name` via the Export
 * dialog's Preset File tab. Export only downloads: it does not switch the
 * current preset and does not reset the dirty baseline.
 */
async function exportPreset(
  page: Page,
  name: string,
  filePath: string,
): Promise<void> {
  await page.getByRole("button", { name: "Export" }).click();
  const dialog = page.getByRole("dialog", { name: "Export" });
  await expect(dialog).toBeVisible();
  const nameInput = dialog.getByLabel("Preset name");
  await nameInput.fill(name);
  await expect(nameInput).toHaveValue(name);
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  await download.saveAs(filePath);
  await expect(dialog).not.toBeVisible();
}

/** Open the hidden file input via the Import button and choose `filePath`. */
async function importPresetFile(page: Page, filePath: string): Promise<void> {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import preset from file" }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(filePath);
}

test.describe("unsaved-changes guard", () => {
  test("file import over a dirty session prompts; confirm applies the import", async ({
    page,
  }, testInfo) => {
    await gotoApp(page);

    // An edit dirties the session; export captures it (step 0 on, step 8
    // off) without cleaning the baseline.
    await toggleStep(page, 0, "true");
    const filePath = testInfo.outputPath("guard-import-confirm.dh");
    await exportPreset(page, "E2E Guard Import", filePath);

    // A second edit the import must revert.
    await toggleStep(page, 8, "true");

    await importPresetFile(page, filePath);
    const confirmDialog = page.getByRole("dialog", { name: "Import Preset?" });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Import Anyway" }).click();

    // The imported preset applied: the exported pattern is back and the
    // post-export edit is gone.
    await expect(
      page.getByText("Preset loaded", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "E2E Guard Import",
    );
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(step(page, 8)).toHaveAttribute("data-active", "false");
  });

  test("file import over a dirty session prompts; cancel keeps the edits", async ({
    page,
  }, testInfo) => {
    await gotoApp(page);

    await toggleStep(page, 0, "true");
    const filePath = testInfo.outputPath("guard-import-cancel.dh");
    await exportPreset(page, "E2E Guard Cancel", filePath);

    await toggleStep(page, 8, "true");

    await importPresetFile(page, filePath);
    const confirmDialog = page.getByRole("dialog", { name: "Import Preset?" });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(confirmDialog).not.toBeVisible();

    // Nothing applied: both edits survive and the current preset is
    // unchanged.
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(step(page, 8)).toHaveAttribute("data-active", "true");
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "init",
    );
  });

  test("share link over a dirty session prompts at boot; confirm applies the shared preset", async ({
    page,
  }) => {
    await gotoApp(page);

    // Shared state: step 0 on, step 8 off.
    await toggleStep(page, 0, "true");
    await page.getByRole("button", { name: "Share preset" }).click();
    const shareDialog = page.getByRole("dialog");
    await expect(shareDialog).toBeVisible();
    const nameInput = shareDialog.getByLabel("Preset name");
    await nameInput.fill("E2E Guard Link");
    await expect(nameInput).toHaveValue("E2E Guard Link");
    await shareDialog.getByRole("button", { name: "Get Link" }).click();
    await expect(shareDialog.getByText("Your link is ready!")).toBeVisible();
    const shareUrl = (
      await shareDialog.getByText(/\?p=/).textContent()
    )?.trim();
    expect(shareUrl).toContain("?p=");
    await shareDialog.getByRole("button", { name: "Close" }).first().click();

    // A second edit keeps the session dirty (the autosave flushes it on
    // navigation) and distinguishes it from the shared state.
    await toggleStep(page, 8, "true");

    // Open the captured link: boot restores the dirty session, then the
    // share-link guard defers the shared preset behind the confirm dialog.
    await page.goto(shareUrl as string);
    const confirmDialog = page.getByRole("dialog", {
      name: "Load Shared Preset?",
    });
    await expect(confirmDialog).toBeVisible({ timeout: 20_000 });
    await confirmDialog.getByRole("button", { name: "Load Anyway" }).click();

    // The shared preset applied with its toast; the dirty edit is gone.
    await expect(
      page.getByText('Loaded shared preset "E2E Guard Link"', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await waitForChannelsReady(page);
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "E2E Guard Link",
    );
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(step(page, 8)).toHaveAttribute("data-active", "false");
  });
});
