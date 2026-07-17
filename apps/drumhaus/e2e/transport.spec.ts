import { expect, test } from "@playwright/test";

import {
  gotoApp,
  litIndicatorIndex,
  startPlayback,
  stopPlayback,
} from "./helpers";

test.describe("transport", () => {
  test("play starts the playhead and stop returns to idle", async ({
    page,
  }) => {
    await gotoApp(page);

    // Clicking play is the user gesture that starts the audio context.
    await startPlayback(page);

    // The playhead advances: the lit step indicator moves to another step.
    const initial = await litIndicatorIndex(page);
    await expect
      .poll(() => litIndicatorIndex(page), { timeout: 10_000 })
      .not.toBe(initial);

    // Stopping returns the transport to idle: play affordance is back and
    // no step indicator stays lit.
    await stopPlayback(page);
  });
});
