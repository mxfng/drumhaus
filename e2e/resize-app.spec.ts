import { expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers";

/**
 * Plugin-style zoom via the floating menu's Resize App submenu
 * (@/design/shell). Covers the auto-fit on load, stepping to the neighboring
 * scale option, min-clamping, and Fit to Screen restoring the fitted size.
 */

/** The scaled chassis wrapper's current scale, in percent. */
function wrapperScale(page: Page): Promise<number> {
  return page.locator('[data-slot="shell-scale-wrapper"]').evaluate((el) => {
    const match = /matrix\(([^,]+),/.exec(getComputedStyle(el).transform);
    return match ? Math.round(parseFloat(match[1]) * 100) : NaN;
  });
}

async function openResizeSubmenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("menuitem", { name: "Resize App" }).click();
}

test.describe("resize app", () => {
  test("zoom steps through scale options and fit to screen restores", async ({
    page,
  }) => {
    await gotoApp(page);

    // Auto-fit on load: at the 1280x720 default viewport the 1440x980px
    // design box (plus 80px padding) fits at an ideal 65%, so the shell
    // lands on the 60% option.
    await expect.poll(() => wrapperScale(page)).toBe(60);

    // Zoom Out steps to the next smaller option.
    await openResizeSubmenu(page);
    await page.getByRole("menuitem", { name: "Zoom Out" }).click();
    await expect.poll(() => wrapperScale(page)).toBe(50);

    // 50% is the smallest option: Zoom Out is now disabled.
    await openResizeSubmenu(page);
    await expect(
      page.getByRole("menuitem", { name: "Zoom Out" }),
    ).toBeDisabled();

    // Fit to Screen restores the fitted scale.
    await page.getByRole("menuitem", { name: "Fit to Screen" }).click();
    await expect.poll(() => wrapperScale(page)).toBe(60);

    // Zoom In steps to the next larger option.
    await openResizeSubmenu(page);
    await page.getByRole("menuitem", { name: "Zoom In" }).click();
    await expect.poll(() => wrapperScale(page)).toBe(70);

    // The radio group tracks the current scale and selecting a percent
    // applies it directly.
    await openResizeSubmenu(page);
    await expect(
      page.getByRole("menuitemradio", { name: "70%", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await page
      .getByRole("menuitemradio", { name: "200%", exact: true })
      .click();
    await expect.poll(() => wrapperScale(page)).toBe(200);

    // 200% is the largest option: Zoom In is now disabled.
    await openResizeSubmenu(page);
    await expect(
      page.getByRole("menuitem", { name: "Zoom In" }),
    ).toBeDisabled();
  });
});
