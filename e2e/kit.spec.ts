import { expect, test } from "@playwright/test";

import {
  gotoApp,
  startPlayback,
  stopPlayback,
  waitForChannelsReady,
} from "./helpers";

test.describe("kit", () => {
  test("swapping kits updates the instruments and stays playable", async ({
    page,
  }) => {
    await gotoApp(page);

    await expect(page.getByRole("combobox", { name: "Kit" })).toHaveText("808");
    await expect(
      page.getByRole("button", { name: "2 Kick2", exact: true }),
    ).toBeVisible();

    // Swap to the House kit via the kit selector.
    await page.getByRole("combobox", { name: "Kit" }).click();
    await page.getByRole("option", { name: "House", exact: true }).click();

    // The screen and the instrument slots reflect the new kit.
    await expect(page.getByRole("combobox", { name: "Kit" })).toHaveText(
      "House",
    );
    await expect(
      page.getByRole("button", { name: "2 Bass", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "7 Piano", exact: true }),
    ).toBeVisible();

    // The new kit's samples finish loading and the app can still play.
    await waitForChannelsReady(page);
    await startPlayback(page);
    await stopPlayback(page);
  });
});
