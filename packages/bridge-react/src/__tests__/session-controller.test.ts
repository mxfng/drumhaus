/**
 * Session controller behavior over deterministic injected seams: memory
 * transports, an in-memory Web Locks stand-in, and a frozen epoch clock.
 * The focus is the logic this package owns for every instrument: the
 * external-store snapshot contract and the deferred-command readiness
 * handling around the connect window.
 */

import {
  createHausSession,
  DEFAULT_BPM,
  LOCK_NAME,
  memoryHub,
  START_LEAD_MS,
  type BridgeMessage,
  type BridgeTransport,
  type HausLockManager,
  type HausSession,
} from "@haus/bridge";
import { afterEach, describe, expect, it } from "vitest";

import {
  createSessionController,
  type SessionController,
} from "../session-controller";
import { flushMicrotasks, memoryLocks } from "./helpers/memory-locks";

interface Rig {
  nowMs: { value: number };
  controller: SessionController;
  session: HausSession;
  createPeer(instrument?: string): HausSession;
  createWire(): BridgeTransport;
  locks: HausLockManager;
}

const cleanups: (() => void)[] = [];

function createRig(locks: HausLockManager = memoryLocks()): Rig {
  const hub = memoryHub();
  const nowMs = { value: 1_000_000 };
  const now = () => nowMs.value;

  const session = createHausSession({
    instrument: "test",
    transport: hub.createTransport(),
    locks,
    now,
  });
  const controller = createSessionController(session, { now });
  cleanups.push(() => controller.disconnect());

  return {
    nowMs,
    controller,
    session,
    createPeer(instrument = "peer") {
      const peer = createHausSession({
        instrument,
        transport: hub.createTransport(),
        locks,
        now,
      });
      cleanups.push(() => peer.disconnect());
      return peer;
    },
    createWire: () => hub.createTransport(),
    locks,
  };
}

/** Hold the conductor lock externally; returns the release function. */
async function blockConductorLock(locks: HausLockManager): Promise<() => void> {
  let release!: () => void;
  void locks.request(
    LOCK_NAME,
    {},
    () => new Promise<void>((resolve) => (release = resolve)),
  );
  await flushMicrotasks();
  return release;
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("snapshot contract", () => {
  it("returns a cached snapshot that changes identity only on change", async () => {
    const rig = createRig();
    const first = rig.controller.getSnapshot();
    expect(rig.controller.getSnapshot()).toBe(first);

    rig.controller.connect();
    await flushMicrotasks();
    const second = rig.controller.getSnapshot();
    expect(second).not.toBe(first);
    expect(second.linked).toBe(true);
    expect(second.isConductor).toBe(true);
    expect(rig.controller.getSnapshot()).toBe(second);
  });

  it("mirrors peers and conductorship", async () => {
    const rig = createRig();
    rig.controller.connect();
    await flushMicrotasks();

    const peer = rig.createPeer();
    peer.connect();
    await flushMicrotasks();

    const snapshot = rig.controller.getSnapshot();
    expect(snapshot.peers).toHaveLength(1);
    expect(snapshot.peers[0]?.instrument).toBe("peer");
    expect(snapshot.isConductor).toBe(true);
  });
});

describe("pre-connect commands (seed then connect)", () => {
  it("applies straight to the session without a rev bump", async () => {
    const rig = createRig();
    rig.controller.setBpm(128);
    rig.controller.setScene(2);

    expect(rig.session.state.bpm).toBe(128);
    expect(rig.session.state.scene).toBe(2);
    expect(rig.session.state.rev).toBe(0);

    // A lone tab conducts and its seeded state broadcasts to late joiners.
    rig.controller.connect();
    await flushMicrotasks();
    const joiner = rig.createPeer();
    joiner.connect();
    await flushMicrotasks();
    expect(joiner.state.bpm).toBe(128);
    expect(joiner.state.scene).toBe(2);
  });
});

describe("deferred commands in the connect window", () => {
  it("queues commands and reflects them optimistically until ready", async () => {
    const locks = memoryLocks();
    const release = await blockConductorLock(locks);
    const rig = createRig(locks);

    rig.controller.connect();
    await flushMicrotasks();
    expect(rig.controller.getSnapshot().isConductor).toBe(false);

    const intents: BridgeMessage[] = [];
    const wire = rig.createWire();
    wire.subscribe((data) => {
      const message = data as BridgeMessage;
      if (message.type === "intent") intents.push(message);
    });

    // No conductor exists: an intent would be dropped, so the command is
    // deferred - nothing on the wire, but the snapshot answers optimistically.
    rig.controller.setBpm(133);
    await flushMicrotasks();
    expect(intents).toHaveLength(0);
    expect(rig.controller.getSnapshot().state.bpm).toBe(133);
    expect(rig.session.state.bpm).toBe(DEFAULT_BPM);

    // Conductorship arrives: the queue replays and the session catches up.
    release();
    await flushMicrotasks();
    expect(rig.controller.getSnapshot().isConductor).toBe(true);
    expect(rig.session.state.bpm).toBe(133);
    expect(rig.controller.getSnapshot().state.bpm).toBe(133);
  });

  it("builds the optimistic grid with the bridge's clock math", async () => {
    const locks = memoryLocks();
    await blockConductorLock(locks);
    const rig = createRig(locks);

    rig.controller.connect();
    await flushMicrotasks();

    rig.controller.play();
    const playing = rig.controller.getSnapshot().state;
    expect(playing.playing).toBe(true);
    expect(playing.startEpochMs).toBe(rig.nowMs.value + START_LEAD_MS);

    rig.controller.setScene(3);
    expect(rig.controller.getSnapshot().state.scene).toBe(3);

    rig.controller.stop();
    const stopped = rig.controller.getSnapshot().state;
    expect(stopped.playing).toBe(false);
    expect(stopped.startEpochMs).toBeNull();
  });

  it("replays through an existing conductor when readiness arrives via its state", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    conductor.setBpm(90);
    conductor.connect();
    await flushMicrotasks();

    // Connect and command in the same synchronous window, before the
    // conductor's first state broadcast lands.
    rig.controller.connect();
    rig.controller.setScene(2);
    await flushMicrotasks();

    // The replayed command round-tripped as an intent.
    expect(conductor.state.scene).toBe(2);
    expect(rig.controller.getSnapshot().state.scene).toBe(2);
    // And the conductor's state won everything it owned.
    expect(rig.controller.getSnapshot().state.bpm).toBe(90);
    expect(rig.controller.getSnapshot().isConductor).toBe(false);
  });

  it("drops deferred commands on disconnect", async () => {
    const locks = memoryLocks();
    const release = await blockConductorLock(locks);
    const rig = createRig(locks);

    rig.controller.connect();
    await flushMicrotasks();
    rig.controller.setBpm(150);
    rig.controller.disconnect();
    expect(rig.controller.getSnapshot().linked).toBe(false);
    expect(rig.controller.getSnapshot().state.bpm).toBe(DEFAULT_BPM);

    release();
    await flushMicrotasks();
    expect(rig.session.state.bpm).toBe(DEFAULT_BPM);
  });

  it("opens the command path on a visible peer even when states are identical", async () => {
    const rig = createRig();
    // A conductor whose state exactly equals ours: its reply broadcast is
    // swallowed by the bridge's no-change guard, so no state event ever
    // fires - the peer signal must open the command path instead.
    const conductor = rig.createPeer();
    conductor.connect();
    await flushMicrotasks();

    rig.controller.connect();
    rig.controller.setScene(2);
    await flushMicrotasks();

    expect(conductor.state.scene).toBe(2);
    expect(rig.controller.getSnapshot().state.scene).toBe(2);
  });

  it("does not open the command path from pre-connect state changes", async () => {
    const locks = memoryLocks();
    await blockConductorLock(locks);
    const rig = createRig(locks);

    // Seeding fires state changes, but only a conductor (or its broadcast)
    // may open the command path - otherwise post-connect commands would be
    // posted into the void.
    rig.controller.setBpm(128);
    rig.controller.connect();
    await flushMicrotasks();

    const intents: BridgeMessage[] = [];
    const wire = rig.createWire();
    wire.subscribe((data) => {
      const message = data as BridgeMessage;
      if (message.type === "intent") intents.push(message);
    });

    rig.controller.setBpm(133);
    await flushMicrotasks();
    expect(intents).toHaveLength(0);
    expect(rig.controller.getSnapshot().state.bpm).toBe(133);
  });
});

describe("ready sessions", () => {
  it("sends commands straight to the session once ready", async () => {
    const rig = createRig();
    rig.controller.connect();
    await flushMicrotasks();

    rig.controller.setBpm(140);
    expect(rig.session.state.bpm).toBe(140);
    expect(rig.session.state.rev).toBe(1);

    rig.controller.play();
    expect(rig.session.state.playing).toBe(true);
    expect(rig.session.state.startEpochMs).toBe(
      rig.nowMs.value + START_LEAD_MS,
    );
  });
});
