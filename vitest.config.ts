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
          // vitest browser mode runs every *.browser.test.ts in ONE shared
          // chromium instance. The offline-render suites each spin up
          // real-time + OfflineAudioContexts that contend for the browser's
          // audio subsystem; with file parallelism that contention once lost a
          // standardized-audio-context node-registration race during generic
          // master-bus Gain wiring (a test-isolation flake, not an engine
          // defect - see split-filter.browser.test.ts). Running the browser
          // files serially removes the contention. This is scheduling-only and
          // cannot change a rendered byte, so golden/stem output is unchanged.
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
