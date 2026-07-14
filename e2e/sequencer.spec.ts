import { expect, test } from "@playwright/test";

import { gotoApp, step, toggleStep } from "./helpers";

test.describe("sequencer", () => {
  test("steps toggle on and off in the grid", async ({ page }) => {
    await gotoApp(page);

    // The init preset starts with an empty pattern.
    await expect(step(page, 0)).toHaveAttribute("data-active", "false");

    // Toggle a few steps on.
    await toggleStep(page, 0, "true");
    await toggleStep(page, 4, "true");
    await toggleStep(page, 15, "true");

    // Untouched neighbours stay off.
    await expect(step(page, 1)).toHaveAttribute("data-active", "false");
    await expect(step(page, 14)).toHaveAttribute("data-active", "false");

    // Toggling again turns a step back off.
    await toggleStep(page, 4, "false");
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(step(page, 15)).toHaveAttribute("data-active", "true");
  });
});
