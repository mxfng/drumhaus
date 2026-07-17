import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { createPulseSession } from "./session";

import "./styles.css";

// One controller for the app's lifetime, connected on load: pulse is always
// linked - that is its purpose. Audio waits for a user gesture (see app.tsx);
// the session does not.
const controller = createPulseSession();
controller.connect();

// A clean goodbye lets peers drop this tab immediately instead of waiting
// out the heartbeat timeout; pageshow rejoins after a bfcache restore.
window.addEventListener("pagehide", () => controller.disconnect());
window.addEventListener("pageshow", () => controller.connect());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App controller={controller} />
  </StrictMode>,
);
