import { expect, test } from "@playwright/test";

import { gotoApp } from "./helpers";

test.describe("app load", () => {
  test("renders the drum machine with the default kit and preset", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(String(error)));

    await gotoApp(page);

    // Default preset and kit are visible on the screen.
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "init",
    );
    await expect(page.getByRole("combobox", { name: "Kit" })).toHaveText("808");

    // All eight instruments of the 808 kit render.
    for (const name of [
      "1 Kick",
      "2 Kick2",
      "3 Snare",
      "4 Clap",
      "5 Hat",
      "6 OHat",
      "7 Tom",
      "8 Tom2",
    ]) {
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    }

    // The 16-step sequencer grid and the transport render.
    await expect(page.locator("button[data-step-index]")).toHaveCount(16);
    await expect(
      page.getByRole("button", { name: "Play", exact: true }),
    ).toBeVisible();

    // The page loaded without console or uncaught errors.
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
