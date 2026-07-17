/**
 * The hook against a real DOM: snapshot values render, session events
 * re-render through useSyncExternalStore, and commands are wired.
 */

import { StrictMode } from "react";
import { createHausSession, memoryHub, type HausSession } from "@haus/bridge";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSessionController } from "../session-controller";
import { useSession } from "../use-session";
import { memoryLocks } from "./helpers/memory-locks";

interface Harness {
  session: HausSession;
  peer: HausSession;
  container: HTMLElement;
  root: Root;
}

const harnesses: Harness[] = [];

function renderHarness(): Harness {
  const hub = memoryHub();
  const locks = memoryLocks();
  const session = createHausSession({
    instrument: "test",
    transport: hub.createTransport(),
    locks,
  });
  const peer = createHausSession({
    instrument: "peer",
    transport: hub.createTransport(),
    locks,
  });
  const controller = createSessionController(session);

  function Probe() {
    const { state, peers, isConductor, linked, connect, setBpm } =
      useSession(controller);
    return (
      <div>
        <output data-testid="bpm">{state.bpm}</output>
        <output data-testid="peers">{peers.length}</output>
        <output data-testid="conductor">{String(isConductor)}</output>
        <output data-testid="linked">{String(linked)}</output>
        <button data-testid="connect" onClick={connect} />
        <button data-testid="bump" onClick={() => setBpm(150)} />
      </div>
    );
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Probe />
    </StrictMode>,
  );

  const harness = { session, peer, container, root };
  harnesses.push(harness);
  return harness;
}

function read(container: HTMLElement, testId: string): string {
  return (
    container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? ""
  );
}

afterEach(() => {
  for (const harness of harnesses.splice(0)) {
    harness.root.unmount();
    harness.container.remove();
    harness.session.disconnect();
    harness.peer.disconnect();
  }
});

describe("useSession", () => {
  it("renders the snapshot and re-renders on session and command events", async () => {
    const { session, peer, container } = renderHarness();

    await vi.waitFor(() => {
      expect(read(container, "bpm")).toBe("120");
      expect(read(container, "linked")).toBe("false");
    });

    container
      .querySelector<HTMLButtonElement>('[data-testid="connect"]')!
      .click();
    await vi.waitFor(() => {
      expect(read(container, "linked")).toBe("true");
      expect(read(container, "conductor")).toBe("true");
    });

    peer.connect();
    await vi.waitFor(() => {
      expect(read(container, "peers")).toBe("1");
    });

    container.querySelector<HTMLButtonElement>('[data-testid="bump"]')!.click();
    await vi.waitFor(() => {
      expect(read(container, "bpm")).toBe("150");
      expect(session.state.bpm).toBe(150);
    });
  });
});
