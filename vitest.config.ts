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
