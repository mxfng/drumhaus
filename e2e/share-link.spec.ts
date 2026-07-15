import { expect, test } from "@playwright/test";

import { gotoApp, step, toggleStep, waitForChannelsReady } from "./helpers";

test.describe("share link round trip", () => {
  test("shares the current preset and reloads it from the URL", async ({
    page,
  }) => {
    await gotoApp(page);

    // A distinctive edit the share link must carry.
    await toggleStep(page, 0, "true");

    // Drive the real share dialog.
    await page.getByRole("button", { name: "Share preset" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const nameInput = dialog.getByLabel("Preset name");
    await nameInput.fill("E2E Shared Link");
    await expect(nameInput).toHaveValue("E2E Shared Link");
    await dialog.getByRole("button", { name: "Get Link" }).click();

    // The result step shows the generated URL (v2 compact payload in ?p=).
    await expect(dialog.getByText("Your link is ready!")).toBeVisible();
    const shareUrl = (await dialog.getByText(/\?p=/).textContent())?.trim();
    expect(shareUrl).toBeTruthy();
    expect(shareUrl).toContain("?p=");
    expect(shareUrl).toContain("n=e2e-shared-link");
    // Two buttons are named "Close" (footer button + the corner X); use
    // the footer one.
    await dialog.getByRole("button", { name: "Close" }).first().click();

    // Undo the edit so a successful link load must restore it.
    await toggleStep(page, 0, "false");

    // Open the captured link fresh, as a recipient would.
    await page.goto(shareUrl as string);

    // The shared preset loads through the document pipeline: toast, preset
    // meta, and the edited step all restored.
    // exact: true dodges the toast's duplicate aria-live announcement node.
    await expect(
      page.getByText('Loaded shared preset "E2E Shared Link"', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await waitForChannelsReady(page);
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "E2E Shared Link",
    );
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
  });
});
