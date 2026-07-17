import { defineConfig, devices } from "@playwright/test";

/**
 * Family-level end-to-end suite (issue #418): multiple instruments on one
 * origin, exercising @haus/bridge session sync through real UIs.
 *
 * The web server mirrors the production deployment plan: one origin, path
 * per instrument (scripts/family-server.mjs serves drumhaus at / and pulse
 * at /pulse/). BroadcastChannel and Web Locks - the bridge's substrate - are
 * same-origin only, so this shape is the point of the harness.
 *
 * Building the apps is not this config's job: it assumes both dists exist.
 * `pnpm test:e2e:family` at the repo root builds drumhaus and pulse first,
 * then runs this suite against the static server.
 */
export default defineConfig({
  testDir: "./family",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : "25%",
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:4446",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node ../scripts/family-server.mjs",
    port: 4446,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
