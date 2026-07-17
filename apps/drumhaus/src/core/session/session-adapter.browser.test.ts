/**
 * Session adapter behavior over deterministic injected seams: @haus/bridge
 * memoryHub transports, an in-memory Web Locks stand-in, a frozen epoch
 * clock, and a fake engine. Covers the drumhaus-specific wiring from issue
 * #417: seed-then-connect (conduct vs adopt), the inbound echo-loop guard,
 * scene <-> variation in both directions, the chain-as-conductor path,
 * grid-aligned play/stop, and the deferred-command window end to end (the
 * queue/optimistic logic itself is unit-tested in @haus/bridge-react).
 *
 * Browser-mode because the real stores' actions reach the AudioEngine
 * (which owns Tone.js objects); the adapter itself only ever talks to the
 * injected fake engine here.
 */

import {
  createSession as createBridgeSession,
  memoryHub,
  START_LEAD_MS,
  type BridgeMessage,
  type BridgeTransport,
  type LockManager,
  type Session,
} from "@haus/bridge";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { isSessionLinked } from "./link-state";
import {
  createSessionAdapter,
  type SessionAdapter,
  type SessionEngine,
} from "./session-adapter";

// -----------------------------------------------------------------------------
// Deterministic seams
// -----------------------------------------------------------------------------

interface LockWaiter {
  granted: boolean;
  aborted: boolean;
  run: () => void;
}

/**
 * In-memory Web Locks stand-in (mirrors the bridge's own test helper):
 * FIFO grant order, held until the callback's promise settles, abortable
 * while pending.
 */
function memoryLocks(): LockManager {
  const held = new Set<string>();
  const queues = new Map<string, LockWaiter[]>();

  function pump(name: string): void {
    if (held.has(name)) return;
    const queue = queues.get(name);
    while (queue !== undefined && queue.length > 0) {
      const waiter = queue.shift()!;
      if (waiter.aborted) continue;
      waiter.granted = true;
      held.add(name);
      queueMicrotask(waiter.run);
      return;
    }
  }

  return {
    request(name, options, callback) {
      return new Promise((resolve, reject) => {
        const waiter: LockWaiter = {
          granted: false,
          aborted: false,
          run: () => {
            void (async () => {
              try {
                resolve(await callback());
              } catch (error) {
                reject(error);
              } finally {
                held.delete(name);
                pump(name);
              }
            })();
          },
        };
        options.signal?.addEventListener("abort", () => {
          if (waiter.granted || waiter.aborted) return;
          waiter.aborted = true;
          reject(new DOMException("The request was aborted.", "AbortError"));
        });
        const queue = queues.get(name) ?? [];
        queue.push(waiter);
        queues.set(name, queue);
        pump(name);
      });
    },
  };
}

/** Drain chained microtasks (memory transport delivery, lock grants). */
async function flushMicrotasks(rounds = 25): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

/** Let the adapter's deferred (macrotask) playback sync run too. */
async function flushAll(): Promise<void> {
  await flushMicrotasks();
  await new Promise((resolve) => setTimeout(resolve, 5));
  await flushMicrotasks();
}

interface FakeEngine extends SessionEngine {
  playCalls: ({ atContextTime?: number } | undefined)[];
  stopCalls: number;
  contextTime: number;
  emitVariation(variation: number): void;
}

function createFakeEngine(): FakeEngine {
  const listeners = new Set<(variation: number) => void>();
  const engine: FakeEngine = {
    playCalls: [],
    stopCalls: 0,
    contextTime: 5,
    play(options) {
      engine.playCalls.push(options);
      return Promise.resolve();
    },
    stop() {
      engine.stopCalls += 1;
    },
    getLiveAudioContext() {
      return { currentTime: engine.contextTime };
    },
    onPlaybackVariationChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emitVariation(variation) {
      listeners.forEach((listener) => listener(variation));
    },
  };
  return engine;
}

interface Rig {
  nowMs: { value: number };
  engine: FakeEngine;
  /** The session instance the adapter currently wraps (fresh per link). */
  adapterSession: () => Session;
  adapter: SessionAdapter;
  /** A raw peer session on the same hub/locks (auto-tracked for cleanup). */
  createPeer(instrument?: string): Session;
  /** A bare wire on the hub, for observing raw protocol traffic. */
  createWire(): BridgeTransport;
  locks: LockManager;
}

const cleanups: (() => void)[] = [];

function createRig(locks: LockManager = memoryLocks()): Rig {
  const hub = memoryHub();
  const nowMs = { value: 1_000_000 };
  const now = () => nowMs.value;
  const engine = createFakeEngine();

  // The adapter creates a FRESH session per link(); track them so tests can
  // address the current one.
  const sessions: Session[] = [];
  const adapter = createSessionAdapter({
    engine,
    now,
    createSession: () => {
      const session = createBridgeSession({
        instrument: "drumhaus",
        transport: hub.createTransport(),
        locks,
        now,
      });
      sessions.push(session);
      return session;
    },
  });
  cleanups.push(() => adapter.unlink());

  return {
    nowMs,
    engine,
    adapter,
    adapterSession: () => sessions[sessions.length - 1],
    createPeer(instrument = "peer") {
      const peer = createBridgeSession({
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

beforeEach(() => {
  useTransportStore.setState({ bpm: 100, isPlaying: false });
  usePatternStore.setState({ variation: 0, chainEnabled: false });
});

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

// -----------------------------------------------------------------------------
// Seed then connect
// -----------------------------------------------------------------------------

describe("seed then connect", () => {
  it("a lone tab conducts and its seeded state becomes the session's", async () => {
    const rig = createRig();
    useTransportStore.setState({ bpm: 128 });
    usePatternStore.setState({ variation: 2 });

    rig.adapter.link();
    await flushMicrotasks();

    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(true);
    expect(rig.adapterSession().state.bpm).toBe(128);
    expect(rig.adapterSession().state.scene).toBe(2);

    // A late joiner adopts the seeded state.
    const joiner = rig.createPeer();
    joiner.connect();
    await flushMicrotasks();
    expect(joiner.state.bpm).toBe(128);
    expect(joiner.state.scene).toBe(2);
    expect(rig.adapter.controller.getSnapshot().peers).toHaveLength(1);
  });

  it("adopts the existing conductor's state when a session already exists", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    conductor.setBpm(90);
    conductor.setScene(1);
    conductor.connect();
    await flushMicrotasks();

    useTransportStore.setState({ bpm: 128 });
    rig.adapter.link();
    await flushMicrotasks();

    // The conductor's state wins; the local bpm jumps. Correct behavior.
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(false);
    expect(useTransportStore.getState().bpm).toBe(90);
    expect(usePatternStore.getState().variation).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// Echo-loop guard
// -----------------------------------------------------------------------------

describe("echo-loop guard", () => {
  it("inbound session bpm reaches the store without re-emitting an intent", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    conductor.connect();
    await flushMicrotasks();

    rig.adapter.link();
    await flushMicrotasks();

    const intents: BridgeMessage[] = [];
    const wire = rig.createWire();
    wire.subscribe((data) => {
      const message = data as BridgeMessage;
      if (message.type === "intent") intents.push(message);
    });

    conductor.setBpm(150);
    await flushAll();

    expect(useTransportStore.getState().bpm).toBe(150);
    expect(intents).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------------
// Scene <-> variation
// -----------------------------------------------------------------------------

describe("scene and variation", () => {
  it("inbound scene selects the variation; local selection posts setScene", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    conductor.connect();
    await flushMicrotasks();

    rig.adapter.link();
    await flushMicrotasks();

    // Inbound: session scene -> pattern store variation.
    conductor.setScene(2);
    await flushMicrotasks();
    expect(usePatternStore.getState().variation).toBe(2);

    // Outbound: local pad selection -> session scene (via intent).
    usePatternStore.getState().setVariation(3);
    await flushMicrotasks();
    expect(conductor.state.scene).toBe(3);
    // And the echo back leaves the local selection untouched.
    expect(usePatternStore.getState().variation).toBe(3);
  });
});

// -----------------------------------------------------------------------------
// Chain as conductor
// -----------------------------------------------------------------------------

describe("chain-driven scenes", () => {
  it("a conducting tab with the chain enabled broadcasts playback variations as scenes", async () => {
    const rig = createRig();
    rig.adapter.link();
    await flushMicrotasks();
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(true);

    const follower = rig.createPeer();
    follower.connect();
    await flushMicrotasks();

    // Chain disabled: bar-boundary variation changes stay local.
    rig.engine.emitVariation(1);
    await flushMicrotasks();
    expect(rig.adapterSession().state.scene).toBe(0);

    usePatternStore.setState({ chainEnabled: true });
    rig.engine.emitVariation(1);
    await flushMicrotasks();
    expect(rig.adapterSession().state.scene).toBe(1);
    expect(follower.state.scene).toBe(1);
  });

  it("a following tab never broadcasts chain variations", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    conductor.connect();
    await flushMicrotasks();

    rig.adapter.link();
    await flushMicrotasks();
    usePatternStore.setState({ chainEnabled: true });

    rig.engine.emitVariation(2);
    await flushAll();
    expect(conductor.state.scene).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Deferred-command window (end to end through the adapter)
// -----------------------------------------------------------------------------

describe("deferred-command window", () => {
  it("a command right after connect is not lost: local immediately, session once ready", async () => {
    const locks = memoryLocks();
    // Hold the conductor lock externally so the adapter's grant is pending
    // and no conductor exists to apply intents.
    let releaseBlocker!: () => void;
    void locks.request(
      "haus:conductor",
      {},
      () => new Promise<void>((resolve) => (releaseBlocker = resolve)),
    );
    await flushMicrotasks();

    const rig = createRig(locks);
    rig.adapter.link();
    await flushMicrotasks();
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(false);

    const intents: BridgeMessage[] = [];
    const wire = rig.createWire();
    wire.subscribe((data) => {
      const message = data as BridgeMessage;
      if (message.type === "intent") intents.push(message);
    });

    // A user command right after connect: no conductor yet, so posting an
    // intent would drop it. Locally it applies immediately (the store owns
    // it), and the controller defers the session command.
    useTransportStore.setState({ bpm: 133 });
    await flushAll();
    expect(intents).toHaveLength(0);
    expect(useTransportStore.getState().bpm).toBe(133);

    // Once this tab conducts, the deferred command lands in the session
    // rather than being lost.
    releaseBlocker();
    await flushMicrotasks();
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(true);
    expect(rig.adapterSession().state.bpm).toBe(133);
  });
});

// -----------------------------------------------------------------------------
// Grid-aligned playback
// -----------------------------------------------------------------------------

describe("grid-aligned playback", () => {
  it("inbound play starts the engine at the shared downbeat; stop stops it", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    conductor.connect();
    await flushMicrotasks();

    rig.adapter.link();
    await flushMicrotasks();

    conductor.play();
    await flushAll();

    expect(rig.engine.playCalls).toHaveLength(1);
    // During the start lead window the next bar boundary is bar 0's
    // downbeat itself: startEpochMs = now + START_LEAD_MS, mapped onto the
    // fake context whose clock reads 5s at the frozen epoch instant.
    const expected = rig.engine.contextTime + START_LEAD_MS / 1000;
    expect(rig.engine.playCalls[0]?.atContextTime).toBeCloseTo(expected, 6);

    // The engine reports the start; the bridge mirror would normally set
    // this - simulate it so the stop path sees a playing transport.
    useTransportStore.setState({ isPlaying: true });

    conductor.stop();
    await flushAll();
    expect(rig.engine.stopCalls).toBe(1);
  });

  it("a tempo rebase while playing glides instead of restarting", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    conductor.connect();
    await flushMicrotasks();

    rig.adapter.link();
    await flushMicrotasks();

    conductor.play();
    await flushAll();
    expect(rig.engine.playCalls).toHaveLength(1);
    useTransportStore.setState({ isPlaying: true });

    conductor.setBpm(160);
    await flushAll();

    // The bpm reached the store (and through it the live transport), but
    // the phase-continuous rebase never restarts local playback.
    expect(useTransportStore.getState().bpm).toBe(160);
    expect(rig.engine.playCalls).toHaveLength(1);
    expect(rig.engine.stopCalls).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Unlink
// -----------------------------------------------------------------------------

describe("unlink", () => {
  it("disconnects and stops reacting to the session", async () => {
    const rig = createRig();
    const conductor = rig.createPeer();
    // Same tempo as the local store, so linking itself changes nothing and
    // the assertion below isolates the unlink behavior.
    conductor.setBpm(100);
    conductor.connect();
    await flushMicrotasks();

    rig.adapter.link();
    await flushMicrotasks();
    expect(rig.adapter.controller.getSnapshot().peers).toHaveLength(1);

    rig.adapter.unlink();
    expect(rig.adapter.isLinked()).toBe(false);
    expect(rig.adapter.controller.getSnapshot().linked).toBe(false);
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(false);

    conductor.setBpm(180);
    await flushAll();
    expect(useTransportStore.getState().bpm).toBe(100);
  });

  it("publishes the linked flag for the transport store (#425)", () => {
    const rig = createRig();
    expect(isSessionLinked()).toBe(false);

    // While linked, togglePlay consults this flag and leaves starting the
    // engine to the adapter's grid-aligned path.
    rig.adapter.link();
    expect(isSessionLinked()).toBe(true);

    rig.adapter.unlink();
    expect(isSessionLinked()).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// Re-link (fresh session per linked period)
// -----------------------------------------------------------------------------

describe("re-link", () => {
  it("re-linking solo after link/play/unlink/stop does not auto-start", async () => {
    const rig = createRig();
    rig.adapter.link();
    await flushMicrotasks();

    // Play while linked: the session carries a grid.
    useTransportStore.setState({ isPlaying: true });
    await flushAll();
    expect(rig.adapterSession().state.playing).toBe(true);
    const playCallsWhileLinked = rig.engine.playCalls.length;

    // Unlink (local playback keeps running), then the user stops locally.
    rig.adapter.unlink();
    useTransportStore.setState({ isPlaying: false });

    // Re-link solo: the fresh session must reflect the local stopped
    // state, not the previous period's playing:true grid - conducting it
    // must neither restart the engine nor broadcast an ancient grid.
    rig.adapter.link();
    await flushAll();

    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(true);
    expect(rig.adapterSession().state.playing).toBe(false);
    expect(rig.adapterSession().state.startEpochMs).toBeNull();
    expect(rig.engine.playCalls.length).toBe(playCallsWhileLinked);
  });

  it("re-linking after conducting at a high rev adopts a younger live session", async () => {
    const rig = createRig();
    rig.adapter.link();
    await flushMicrotasks();
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(true);

    // Conduct several changes so the first period's rev climbs well above
    // a fresh session's.
    useTransportStore.setState({ bpm: 110 });
    useTransportStore.setState({ bpm: 120 });
    useTransportStore.setState({ bpm: 130 });
    await flushAll();
    const staleSession = rig.adapterSession();
    expect(staleSession.state.rev).toBeGreaterThanOrEqual(3);

    rig.adapter.unlink();

    // A fresh session forms elsewhere at a low rev.
    const conductor = rig.createPeer();
    conductor.setBpm(90);
    conductor.connect();
    await flushMicrotasks();
    expect(conductor.state.rev).toBe(0);

    // Re-linking must adopt the live conductor's state (a stale-high rev
    // would make the follower deaf to every broadcast).
    rig.adapter.link();
    await flushMicrotasks();
    expect(rig.adapterSession()).not.toBe(staleSession);
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(false);
    expect(useTransportStore.getState().bpm).toBe(90);

    // Still listening: later conductor changes keep landing.
    conductor.setBpm(95);
    await flushAll();
    expect(useTransportStore.getState().bpm).toBe(95);

    // Handover: winning conductorship must rebroadcast the live state, not
    // time-travel the session back to the stale first period.
    conductor.disconnect();
    await flushMicrotasks();
    expect(rig.adapter.controller.getSnapshot().isConductor).toBe(true);
    expect(rig.adapterSession().state.bpm).toBe(95);
    expect(useTransportStore.getState().bpm).toBe(95);
  });
});
