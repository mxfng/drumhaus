import { expect, test, type Page } from "@playwright/test";

import { gotoApp, startPlayback, step, toggleStep } from "./helpers";

/** The hardware undo/redo button (label flips while Shift is held). */
function undoButton(page: Page, label: "undo" | "redo") {
  return page.getByRole("button", { name: label, exact: true });
}

test.describe("undo/redo", () => {
  test("the hardware button undoes, and shift flips it to redo", async ({
    page,
  }) => {
    await gotoApp(page);

    // A fresh session has nothing to undo.
    await expect(undoButton(page, "undo")).toBeDisabled();

    await toggleStep(page, 0, "true");
    await expect(undoButton(page, "undo")).toBeEnabled();

    await undoButton(page, "undo").click();
    await expect(step(page, 0)).toHaveAttribute("data-active", "false");
    await expect(undoButton(page, "undo")).toBeDisabled();

    // Holding shift relabels the same button as redo (MPC/Push convention).
    await page.keyboard.down("Shift");
    await expect(undoButton(page, "redo")).toBeEnabled();
    await undoButton(page, "redo").click();
    await page.keyboard.up("Shift");

    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
    await expect(undoButton(page, "undo")).toBeEnabled();
  });

  test("keyboard shortcuts undo and redo", async ({ page }) => {
    await gotoApp(page);

    await toggleStep(page, 3, "true");
    await expect(undoButton(page, "undo")).toBeEnabled();

    await page.keyboard.press("ControlOrMeta+z");
    await expect(step(page, 3)).toHaveAttribute("data-active", "false");

    await page.keyboard.press("ControlOrMeta+Shift+z");
    await expect(step(page, 3)).toHaveAttribute("data-active", "true");
  });

  test("the floating menu exposes undo and redo", async ({ page }) => {
    await gotoApp(page);

    const menuTrigger = page.getByRole("button", { name: "Menu" });

    await menuTrigger.click();
    await expect(page.getByRole("menuitem", { name: "Undo" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByRole("menuitem", { name: "Redo" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await page.keyboard.press("Escape");

    await toggleStep(page, 5, "true");
    await expect(undoButton(page, "undo")).toBeEnabled();

    await menuTrigger.click();
    await page.getByRole("menuitem", { name: "Undo" }).click();
    await expect(step(page, 5)).toHaveAttribute("data-active", "false");

    await menuTrigger.click();
    await page.getByRole("menuitem", { name: "Redo" }).click();
    await expect(step(page, 5)).toHaveAttribute("data-active", "true");
  });

  test("a drag-paint across the grid reverts as one undo unit", async ({
    page,
  }) => {
    await gotoApp(page);

    // Paint steps 2 through 6 in a single pointer drag.
    const from = await step(page, 2).boundingBox();
    const to = await step(page, 6).boundingBox();
    if (!from || !to) throw new Error("step buttons not laid out");

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 20,
    });
    await page.mouse.up();

    for (const index of [2, 3, 4, 5, 6]) {
      await expect(step(page, index)).toHaveAttribute("data-active", "true");
    }

    // One undo clears the whole painted run...
    await expect(undoButton(page, "undo")).toBeEnabled();
    await undoButton(page, "undo").click();
    for (const index of [2, 3, 4, 5, 6]) {
      await expect(step(page, index)).toHaveAttribute("data-active", "false");
    }

    // ...and it was exactly one history entry, not five.
    await expect(undoButton(page, "undo")).toBeDisabled();
  });

  test("undo keeps playback running when the kit is unchanged", async ({
    page,
  }) => {
    await gotoApp(page);

    await toggleStep(page, 0, "true");
    await expect(undoButton(page, "undo")).toBeEnabled();
    await startPlayback(page);

    await page.keyboard.press("ControlOrMeta+z");
    await expect(step(page, 0)).toHaveAttribute("data-active", "false");

    // The transport never stopped.
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
  });
});
