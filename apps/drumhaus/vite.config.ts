import { execSync } from "child_process";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { dhFilesPlugin } from "./dh-files-plugin";

// Build-time metadata helpers
const getGitHash = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
};

const appVersion = getGitHash();
const nodeVersion = process.version;

/**
 * LINK (the shared cross-instrument session) ships dark for now: on in dev,
 * on when VITE_ENABLE_LINK is explicitly truthy at build time (CI and the
 * e2e suites), off otherwise. Production builds set nothing, so deployed
 * builds exclude the feature entirely; enabling it later is a build-config
 * env var, not a code change. Build-time constant so the off path
 * dead-code-eliminates.
 */
const enableLink = (command: "build" | "serve") =>
  command === "serve" ||
  ["1", "true"].includes(process.env.VITE_ENABLE_LINK ?? "");

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    dhFilesPlugin(),
    tailwindcss(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __NODE_VERSION__: JSON.stringify(nodeVersion),
    __ENABLE_LINK__: JSON.stringify(enableLink(command)),
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 4444,
    forwardConsole: true,
  },
  build: {
    outDir: "dist",
  },
}));
