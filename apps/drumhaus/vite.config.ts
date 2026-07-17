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

// https://vitejs.dev/config/
export default defineConfig({
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
});
