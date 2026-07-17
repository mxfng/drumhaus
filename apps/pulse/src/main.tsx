import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { createPulseSession } from "./session";

import "./styles.css";

// One session for the app's lifetime, connected on load: pulse is always
// linked - that is its purpose. Audio waits for a user gesture (see app.tsx);
// the session does not.
const session = createPulseSession();
session.connect();

// A clean goodbye lets peers drop this tab immediately instead of waiting
// out the heartbeat timeout; pageshow rejoins after a bfcache restore.
window.addEventListener("pagehide", () => session.disconnect());
window.addEventListener("pageshow", () => session.connect());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App session={session} />
  </StrictMode>,
);
