/**
 * @haus/bridge-react - the shared React-facing glue over @haus/bridge.
 * Headless only: a session controller (external-store contract + the
 * deferred-command readiness handling) and the useSession hook.
 */

export { createSessionController } from "./session-controller";
export type {
  SessionController,
  SessionSnapshot,
  SessionControllerOptions,
} from "./session-controller";
export { useSession } from "./use-session";
export type { SessionCommands, SessionView } from "./use-session";
