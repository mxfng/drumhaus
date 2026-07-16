import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { dhFilesPlugin } from "./dh-files-plugin";

export default defineConfig({
  plugins: [dhFilesPlugin()],
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json (vite 8 / rolldown feature)
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.browser.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.ts"],
          // Run browser test FILES serially (issue #363). Every
          // *.browser.test.ts runs in the one shared chromium browser, and the
          // offline-render suites (golden, stem, master-level, rebuild,
          // kit-swap, split-filter) each spin up real-time + OfflineAudioContexts.
          // Under file parallelism those contexts contend for the browser
          // process's audio subsystem, and standardized-audio-context can
          // intermittently fail to resolve a freshly-created node's native
          // counterpart during generic node wiring (a
          // "value with the given key could not be found" crash in
          // connectMasterBusNodes, before any effect value is applied).
          // Serializing removes that cross-file contention. It is scheduling
          // only - each file still renders identically, so golden/stem output
          // stays byte-identical.
          fileParallelism: false,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
