/**
 * Pulse's session hookup - the reference integration of @haus/bridge: one
 * session wrapped in @haus/bridge-react's controller. The controller owns
 * everything an instrument would otherwise reimplement - the external-store
 * snapshot contract and the deferred-command readiness handling around the
 * connect window - so the instrument's own code reduces to this factory.
 *
 * Pulse is always linked - that is its purpose - so main.tsx connects the
 * controller on load and across pagehide/pageshow; the UI reads it through
 * useSession (app.tsx).
 */

import { createSession } from "@haus/bridge";
import {
  createSessionController,
  type SessionController,
} from "@haus/bridge-react";

function createPulseSession(): SessionController {
  return createSessionController(createSession({ instrument: "pulse" }));
}

export { createPulseSession };
