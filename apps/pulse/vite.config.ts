import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Pulse is served at /pulse/ on the family origin (one origin, path per
// instrument): BroadcastChannel and Web Locks - everything @haus/bridge is
// built on - are same-origin only.
export default defineConfig({
  base: "/pulse/",
  plugins: [react()],
  server: {
    port: 4445,
  },
  build: {
    outDir: "dist",
  },
});
