import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { gotoApp, step, toggleStep } from "./helpers";

test.describe(".dh file export and import", () => {
  test("exports a v2.1 document that re-imports cleanly", async ({
    page,
  }, testInfo) => {
    await gotoApp(page);

    // A distinctive edit the round-trip must preserve.
    await toggleStep(page, 0, "true");

    // Export via the dialog's Preset File tab (the default tab).
    await page.getByRole("button", { name: "Export" }).click();
    const dialog = page.getByRole("dialog", { name: "Export" });
    await expect(dialog).toBeVisible();
    const nameInput = dialog.getByLabel("Preset name");
    await nameInput.fill("E2E Round Trip");
    await expect(nameInput).toHaveValue("E2E Round Trip");
    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("E2E Round Trip.dh");

    const filePath = testInfo.outputPath("e2e-round-trip.dh");
    await download.saveAs(filePath);

    // The exported payload is a version 2.1 document in domain units, with
    // the split filter as a canonical { side, cutoffHz } value.
    const exported = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(exported.kind).toBe("drumhaus.preset");
    expect(exported.version).toBe(2.1);
    expect(typeof exported.kit.id).toBe("string");
    expect(exported.channels).toHaveLength(8);
    expect(typeof exported.channels[0].filter.side).toBe("string");
    expect(typeof exported.channels[0].filter.cutoffHz).toBe("number");
    expect(typeof exported.master.compThresholdDb).toBe("number");
    expect(exported.transport.swing).toBeLessThanOrEqual(0.375);

    // Undo the edit so a successful import must restore it.
    await toggleStep(page, 0, "false");

    // Import the downloaded file back through the UI.
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import preset from file" }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(filePath);

    // The imported preset becomes current and restores the edit.
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "E2E Round Trip",
    );
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
  });
});
