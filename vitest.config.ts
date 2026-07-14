import { readFileSync } from "node:fs";
import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// Minimal mirror of the dh-files plugin in vite.config.ts so modules that
// import .dh/.dhkit files (e.g. the instruments store's default kit) can load
// in tests. We intentionally do not import the app's vite.config.ts because
// its react-compiler babel and tailwind plugins are unnecessary for tests.
function dhFilesPlugin(): Plugin {
  return {
    name: "dh-files-loader",
    transform(_code, id) {
      if (id.endsWith(".dhkit") || id.endsWith(".dh")) {
        const content = readFileSync(id, "utf-8");
        return {
          code: `export default ${content}`,
          map: null,
          moduleType: "js",
        };
      }
    },
  };
}

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
