/**
 * The headless React hook over a SessionController: one
 * useSyncExternalStore subscription exposing the session snapshot
 * ({ state, peers, isConductor, linked }) plus the session commands
 * ({ connect, disconnect, play, stop, setBpm, setScene }).
 *
 * Headless by design - no styling, no instrument specifics. Instruments
 * render their own affordances on top; the controller (and with it the
 * deferred-command readiness handling) is shared for free.
 */

import { useMemo, useSyncExternalStore } from "react";
import type { SceneId } from "@haus/bridge";

import type { SessionController, SessionSnapshot } from "./session-controller";

interface SessionCommands {
  connect(): void;
  disconnect(): void;
  play(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setScene(scene: SceneId): void;
}

type SessionView = SessionSnapshot & SessionCommands;

function useSession(controller: SessionController): SessionView {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      connect: controller.connect,
      disconnect: controller.disconnect,
      play: controller.play,
      stop: controller.stop,
      setBpm: controller.setBpm,
      setScene: controller.setScene,
    }),
    [snapshot, controller],
  );
}

export { useSession };
export type { SessionCommands, SessionView };
