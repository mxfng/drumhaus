import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { bootstrapSession } from "@/features/preset/session/bootstrap";
import { App } from "./app";

import "./globals.css";

// Restore the session document synchronously before React mounts, exactly
// where the retired per-store persists used to rehydrate (at import time):
// first paint always shows real state, never a flash of init defaults.
// Importing bootstrap pulls in the stores, so by this line they exist;
// applyPresetDocument is a plain function and the engine bridge re-pushes
// everything at mount, so pre-mount application is safe.
bootstrapSession();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
