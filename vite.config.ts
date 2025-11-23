import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, Plugin } from "vite";

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

// Custom plugin to handle .dh and .dhkit files as JSON
function dhFilesPlugin(): Plugin {
  return {
    name: "dh-files-loader",
    transform(_code, id) {
      if (id.endsWith(".dhkit") || id.endsWith(".dh")) {
        const content = readFileSync(id, "utf-8");
        return {
          code: `export default ${content}`,
          map: null,
        };
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dhFilesPlugin(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __NODE_VERSION__: JSON.stringify(nodeVersion),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 4444,
  },
  build: {
    outDir: "dist",
  },
});
