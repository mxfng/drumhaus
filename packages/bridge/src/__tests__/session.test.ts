/**
 * Session behavior over deterministic injected seams (memory transport,
 * memory locks, fake clock): conductor/follower roles, the reducer and rev
 * discipline, adoption guards, peer bookkeeping and timeouts, and defensive
 * handling of malformed wire data.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSession as createBridgeSession,
  reduceIntent,
  type Session,
} from "../session";
import { memoryHub, type BridgeTransport } from "../transport";
import { START_LEAD_MS, type SessionState } from "../types";
import { flushMicrotasks, memoryLocks } from "./helpers/memory-locks";

interface Rig {
  nowMs: { value: number };
  createSession(instrument: string, label?: string): Session;
  createWire(): BridgeTransport;
}

const sessions: Session[] = [];

/** One shared hub + lock manager + fake clock per test. */
function createRig(): Rig {
  const hub = memoryHub();
  const locks = memoryLocks();
  const nowMs = { value: 1_000_000 };
  return {
    nowMs,
    createSession(instrument, label) {
      const session = createBridgeSession({
        instrument,
        ...(label !== undefined ? { label } : {}),
        transport: hub.createTransport(),
        locks,
        now: () => nowMs.value,
      });
      sessions.push(session);
      return session;
    },
    createWire: () => hub.createTransport(),
  };
}

afterEach(() => {
  for (const session of sessions.splice(0)) session.disconnect();
  vi.useRealTimers();
});

describe("reduceIntent", () => {
  const stopped: SessionState = {
    rev: 4,
    bpm: 120,
    playing: false,
    startEpochMs: null,
    scene: 0,
  };

  it("starts playback START_LEAD_MS in the future", () => {
    const next = reduceIntent(stopped, { kind: "play" }, 5000);
    expect(next).toEqual({
      ...stopped,
      playing: true,
      startEpochMs: 5000 + START_LEAD_MS,
    });
  });

  it("stops playback and clears the grid origin", () => {
    const playing = { ...stopped, playing: true, startEpochMs: 5200 };
    expect(reduceIntent(playing, { kind: "stop" }, 9000)).toEqual(stopped);
  });

  it("treats redundant play/stop/scene/bpm as no-ops", () => {
    const playing = { ...stopped, playing: true, startEpochMs: 5200 };
    expect(reduceIntent(playing, { kind: "play" }, 9000)).toBeNull();
    expect(reduceIntent(stopped, { kind: "stop" }, 9000)).toBeNull();
    expect(
      reduceIntent(stopped, { kind: "setScene", scene: 0 }, 9000),
    ).toBeNull();
    expect(
      reduceIntent(stopped, { kind: "setBpm", bpm: 120 }, 9000),
    ).toBeNull();
  });

  it("rejects invalid values", () => {
    expect(
      reduceIntent(stopped, { kind: "setBpm", bpm: Number.NaN }, 0),
    ).toBeNull();
    expect(
      reduceIntent(stopped, { kind: "setScene", scene: 9 as never }, 0),
    ).toBeNull();
  });

  it("rebases the grid on tempo change while playing", () => {
    const playing = { ...stopped, playing: true, startEpochMs: 5000 };
    // 4 beats elapsed at 120 bpm (2000ms); at 60 bpm those take 4000ms.
    const next = reduceIntent(playing, { kind: "setBpm", bpm: 60 }, 7000);
    expect(next).toEqual({ ...playing, bpm: 60, startEpochMs: 3000 });
  });
});

describe("solo session", () => {
  it("conducts itself immediately after connect", async () => {
    const rig = createRig();
    const session = rig.createSession("drumhaus");
    const conductorEvents: boolean[] = [];
    session.onConductorChange((isConductor) =>
      conductorEvents.push(isConductor),
    );

    expect(session.isConductor).toBe(false);
    session.connect();
    await flushMicrotasks();

    expect(session.isConductor).toBe(true);
    expect(conductorEvents).toEqual([true]);
  });

  it("applies its own commands with rev bumps", async () => {
    const rig = createRig();
    const session = rig.createSession("drumhaus");
    session.connect();
    await flushMicrotasks();

    session.setBpm(150);
    expect(session.state).toMatchObject({ rev: 1, bpm: 150 });

    session.play();
    expect(session.state).toMatchObject({
      rev: 2,
      playing: true,
      startEpochMs: rig.nowMs.value + START_LEAD_MS,
    });

    session.setScene(2);
    expect(session.state).toMatchObject({ rev: 3, scene: 2 });

    session.stop();
    expect(session.state).toMatchObject({
      rev: 4,
      playing: false,
      startEpochMs: null,
    });

    // No-ops do not bump rev.
    session.stop();
    session.setScene(2);
    expect(session.state.rev).toBe(4);
  });

  it("clamps bpm commands", async () => {
    const rig = createRig();
    const session = rig.createSession("drumhaus");
    session.connect();
    await flushMicrotasks();
    session.setBpm(9999);
    expect(session.state.bpm).toBe(300);
  });
});

describe("standalone (never connected)", () => {
  it("applies commands locally without bumping rev", () => {
    const rig = createRig();
    const session = rig.createSession("drumhaus");
    session.setBpm(90);
    session.play();
    expect(session.state).toMatchObject({
      rev: 0,
      bpm: 90,
      playing: true,
      startEpochMs: rig.nowMs.value + START_LEAD_MS,
    });
  });
});

describe("conductor and follower", () => {
  async function connectPair(rig: Rig): Promise<[Session, Session]> {
    const a = rig.createSession("drumhaus", "a");
    const b = rig.createSession("bass", "b");
    a.connect();
    await flushMicrotasks();
    b.connect();
    await flushMicrotasks();
    expect(a.isConductor).toBe(true);
    expect(b.isConductor).toBe(false);
    return [a, b];
  }

  it("propagates conductor changes to followers", async () => {
    const rig = createRig();
    const [a, b] = await connectPair(rig);
    a.setBpm(150);
    await flushMicrotasks();
    expect(b.state).toEqual(a.state);
    expect(b.state).toMatchObject({ rev: 1, bpm: 150 });
  });

  it("round-trips a follower intent through the conductor", async () => {
    const rig = createRig();
    const [a, b] = await connectPair(rig);
    b.setBpm(90);
    // The follower does not self-apply; it waits for the conductor's state.
    expect(b.state.bpm).toBe(120);
    await flushMicrotasks();
    expect(a.state.bpm).toBe(90);
    expect(b.state).toEqual(a.state);
  });

  it("lets a late joiner adopt state via hello", async () => {
    const rig = createRig();
    const a = rig.createSession("drumhaus");
    a.connect();
    await flushMicrotasks();
    a.setBpm(150);
    a.setScene(3);

    const c = rig.createSession("synth");
    c.connect();
    await flushMicrotasks();
    expect(c.state).toEqual(a.state);
    expect(c.state).toMatchObject({ bpm: 150, scene: 3 });
  });

  it("hands conductorship off on disconnect with state intact", async () => {
    const rig = createRig();
    const [a, b] = await connectPair(rig);
    a.setBpm(132);
    a.setScene(1);
    await flushMicrotasks();
    const settled = b.state;

    a.disconnect();
    await flushMicrotasks();
    expect(b.isConductor).toBe(true);
    // The rebroadcast keeps the same rev; nothing regresses.
    expect(b.state).toEqual(settled);
    expect(b.peers).toEqual([]);
  });

  it("tracks peers symmetrically and honors goodbye", async () => {
    const rig = createRig();
    const [a, b] = await connectPair(rig);
    expect(a.peers.map((p) => p.instrument)).toEqual(["bass"]);
    expect(b.peers.map((p) => p.instrument)).toEqual(["drumhaus"]);

    b.disconnect();
    await flushMicrotasks();
    expect(a.peers).toEqual([]);
  });

  it("ignores state messages older than the local rev", async () => {
    const rig = createRig();
    const [a, b] = await connectPair(rig);
    a.setBpm(90);
    a.setBpm(96);
    await flushMicrotasks();
    expect(b.state.rev).toBe(2);

    const wire = rig.createWire();
    wire.post({
      v: 1,
      type: "state",
      from: "stale-conductor",
      state: { rev: 1, bpm: 55, playing: false, startEpochMs: null, scene: 0 },
    });
    await flushMicrotasks();
    expect(b.state).toMatchObject({ rev: 2, bpm: 96 });
  });

  it("ignores malformed and foreign-version wire data", async () => {
    const rig = createRig();
    const [a, b] = await connectPair(rig);
    const wire = rig.createWire();
    const before = b.state;

    wire.post("garbage" as never);
    wire.post({ v: 2, type: "state", from: "future" } as never);
    wire.post({
      v: 1,
      type: "intent",
      from: "x",
      intent: { kind: "warp" },
    } as never);
    wire.post({
      v: 1,
      type: "state",
      from: "x",
      state: {
        rev: 99,
        bpm: 9000,
        playing: false,
        startEpochMs: null,
        scene: 0,
      },
    } as never);
    await flushMicrotasks();

    expect(a.state).toEqual(before);
    expect(b.state).toEqual(before);
  });
});

describe("peer timeout bookkeeping", () => {
  it("drops peers after PEER_TIMEOUT_MS of silence, keeps live ones", async () => {
    vi.useFakeTimers();
    const rig = createRig();
    const session = rig.createSession("drumhaus");
    session.connect();
    await flushMicrotasks();

    const wire = rig.createWire();
    const hello = (peerId: string) => {
      wire.post({
        v: 1,
        type: "hello",
        from: peerId,
        peer: { id: peerId, instrument: "bass" },
      });
    };
    const heartbeat = (peerId: string) => {
      wire.post({
        v: 1,
        type: "heartbeat",
        from: peerId,
        peer: { id: peerId, instrument: "bass" },
      });
    };

    hello("quiet");
    hello("chatty");
    await flushMicrotasks();
    expect(session.peers.map((p) => p.id).sort()).toEqual(["chatty", "quiet"]);

    // "chatty" keeps heartbeating; "quiet" goes silent.
    for (let i = 0; i < 4; i++) {
      rig.nowMs.value += 2000;
      heartbeat("chatty");
      await vi.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
    }

    expect(session.peers.map((p) => p.id)).toEqual(["chatty"]);
  });
});

describe("subscriptions", () => {
  it("returns working unsubscribers", async () => {
    const rig = createRig();
    const session = rig.createSession("drumhaus");
    session.connect();
    await flushMicrotasks();

    let stateEvents = 0;
    const unsubscribe = session.onStateChange(() => stateEvents++);
    session.setBpm(100);
    unsubscribe();
    session.setBpm(110);
    expect(stateEvents).toBe(1);
  });
});
