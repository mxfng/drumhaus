import { expect, test, type Page } from "@playwright/test";

import { gotoApp } from "./helpers";

/** The instrument slot that is currently selected (voice mode). */
function selectedInstrument(page: Page) {
  return page.locator("[data-instrument-index][data-selected]");
}

test.describe("instrument keybindings", () => {
  test("digit keys select voices by physical position (issue #283)", async ({
    page,
  }) => {
    await gotoApp(page);

    // Record what the app actually receives so the layout-mismatch case
    // below is verifiably real (event.key must not be the digit).
    await page.evaluate(() => {
      const keys: { key: string; code: string }[] = [];
      (window as unknown as Record<string, unknown>).__e2eKeydowns = keys;
      window.addEventListener("keydown", (event) => {
        keys.push({ key: event.key, code: event.code });
      });
    });

    // Voice 1 is selected by default.
    await expect(selectedInstrument(page)).toHaveAttribute(
      "data-instrument-index",
      "0",
    );

    // Plain US-layout digit press: "3" selects the third voice.
    await page.keyboard.press("3");
    await expect(selectedInstrument(page)).toHaveAttribute(
      "data-instrument-index",
      "2",
    );

    // Layout-mismatched digit (AZERTY-style): the physical Digit1 key
    // produces key "&", not "1". Playwright's keyboard always emits
    // US-layout key values, so drive Chromium's input domain directly.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "&",
      code: "Digit1",
      windowsVirtualKeyCode: 49,
      nativeVirtualKeyCode: 49,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "&",
      code: "Digit1",
      windowsVirtualKeyCode: 49,
      nativeVirtualKeyCode: 49,
    });

    // The first voice is selected via the physical key position.
    await expect(selectedInstrument(page)).toHaveAttribute(
      "data-instrument-index",
      "0",
    );

    // Prove the app saw a genuinely layout-mismatched event.
    const keydowns = await page.evaluate(
      () =>
        (window as unknown as Record<string, unknown>).__e2eKeydowns as {
          key: string;
          code: string;
        }[],
    );
    expect(keydowns).toContainEqual({ key: "3", code: "Digit3" });
    expect(keydowns).toContainEqual({ key: "&", code: "Digit1" });
    expect(keydowns).not.toContainEqual({ key: "1", code: "Digit1" });
  });
});
