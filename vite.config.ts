import { readFileSync } from "fs";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, Plugin } from "vite";

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
  plugins: [react(), dhFilesPlugin()],
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
