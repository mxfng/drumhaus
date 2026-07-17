import { readFileSync } from "node:fs";
import type { Plugin } from "vite";

/**
 * Loads .dh and .dhkit files (presets/kits stored as JSON) as ES modules.
 *
 * Shared by vite.config.ts and vitest.config.ts - vitest intentionally does
 * not import the app's vite config (its react-compiler babel and tailwind
 * plugins are unnecessary for tests), so this plugin lives in its own file
 * to keep the two configs from drifting.
 */
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

export { dhFilesPlugin };
