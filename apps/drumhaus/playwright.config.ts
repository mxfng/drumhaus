import { defineConfig, devices } from "@playwright/test";

/**
 * UI-driving end-to-end suite (issue #271).
 *
 * Runs against a production build served by `vite preview` on port 4444 for
 * CI fidelity. In CI the build step has already produced `dist/`, so the web
 * server only needs to serve it; locally the suite rebuilds first so it
 * always exercises the current source.
 *
 * Kept fully separate from vitest: vitest only picks up `.test.ts` files
 * under `src`, and this runner only picks up `.spec.ts` files under `e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // CI runs single-worker and gets standard retries. Locally we keep parallel
  // workers but cap them: with the default (~50% of cores) the audio-heavy
  // specs (offline WAV renders) saturate CPU at suite start and starve the
  // storage-heavy, UI-driven library.spec flows past their 10s expect timeout
  // (issue #367). A modest cap removes that contention; the single local retry
  // is a belt-and-suspenders net, not the primary fix.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : "25%",
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  // Audio engine boot + offline WAV renders need generous headroom on CI.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:4444",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm preview" : "pnpm build && pnpm preview",
    port: 4444,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
