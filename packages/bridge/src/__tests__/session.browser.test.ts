/**
 * Real-browser integration: multiple createSession instances in one page
 * over a real BroadcastChannel and real Web Locks. BroadcastChannel delivers
 * between channel instances in the same context and Web Locks queue within
 * one context exactly as across tabs, so this exercises the production code
 * paths end to end. Lock names and channel names are scoped per test so
 * suites cannot contend with each other.
 */

import { afterEach, describe, expect, it } from "vitest";

import { beatMs, beatsAt, epochNowMs } from "../clock";
import type { LockManager } from "../election";
import { createSession, type Session } from "../session";
import { broadcastChannelTransport } from "../transport";
import type { SessionState } from "../types";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

/** Scope the real Web Locks to this test so suites cannot interfere. */
function scopedLocks(scope: string): LockManager {
  return {
    request: (name, options, callback) =>
      navigator.locks.request(`${scope}:${name}`, options, callback),
  };
}

function createScope(): (instrument: string, label?: string) => Session {
  const scope = `bridge-test-${crypto.randomUUID()}`;
  return (instrument, label) => {
    const transport = broadcastChannelTransport(`${scope}:channel`);
    const session = createSession({
      instrument,
      ...(label !== undefined ? { label } : {}),
      transport,
      locks: scopedLocks(scope),
    });
    cleanups.push(() => {
      session.disconnect();
      transport.close();
    });
    return session;
  };
}

function until(
  condition: () => boolean,
  label: string,
  timeoutMs = 4000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const tick = () => {
      if (condition()) {
        resolve();
        return;
      }
      if (performance.now() - startedAt > timeoutMs) {
        reject(new Error(`timed out waiting for: ${label}`));
        return;
      }
      setTimeout(tick, 10);
    };
    tick();
  });
}

describe("session in a real browser", () => {
  it("converges two sessions over a real BroadcastChannel", async () => {
    const create = createScope();
    const a = create("drumhaus", "left");
    const b = create("bass", "right");
    a.connect();
    await until(() => a.isConductor, "first session conducting");
    b.connect();

    a.setBpm(150);
    await until(() => b.state.bpm === 150, "follower adopting bpm");
    expect(b.state).toEqual(a.state);
    expect(b.isConductor).toBe(false);

    await until(
      () => a.peers.length === 1 && b.peers.length === 1,
      "peer discovery",
    );
    expect(a.peers[0]).toMatchObject({
      instrument: "bass",
      label: "right",
    });
    expect(b.peers[0]).toMatchObject({ instrument: "drumhaus", label: "left" });
  });

  it("elects via real Web Locks and hands off on disconnect with state intact", async () => {
    const create = createScope();
    const a = create("drumhaus");
    const b = create("bass");
    a.connect();
    await until(() => a.isConductor, "first session conducting");
    b.connect();

    a.setBpm(132);
    a.setScene(2);
    await until(() => b.state.scene === 2, "follower catching up");
    const settled = b.state;
    expect(b.isConductor).toBe(false);

    a.disconnect();
    await until(() => b.isConductor, "handover to second session");
    expect(b.state).toEqual(settled);
  });

  it("lets a late joiner adopt state after hello", async () => {
    const create = createScope();
    const a = create("drumhaus");
    a.connect();
    await until(() => a.isConductor, "conductor ready");
    a.setBpm(150);
    a.setScene(3);

    const c = create("synth");
    c.connect();
    await until(() => c.state.bpm === 150, "late joiner adopting state");
    expect(c.state).toEqual(a.state);
  });

  it("round-trips a follower's setBpm intent through the conductor", async () => {
    const create = createScope();
    const a = create("drumhaus");
    const b = create("bass");
    a.connect();
    await until(() => a.isConductor, "conductor ready");
    b.connect();
    await until(() => b.peers.length === 1, "follower joined");

    b.setBpm(96);
    await until(
      () => a.state.bpm === 96 && b.state.bpm === 96,
      "intent round-trip",
    );
    expect(b.state).toEqual(a.state);
    expect(a.state.rev).toBeGreaterThanOrEqual(1);
  });

  it("keeps the derived grid continuous across peers through a mid-play rebase", async () => {
    const create = createScope();
    const a = create("drumhaus");
    const b = create("bass");
    a.connect();
    await until(() => a.isConductor, "conductor ready");
    b.connect();

    a.play();
    await until(() => b.state.playing, "follower playing");
    const before: SessionState = b.state;
    // Let the downbeat land so the rebase happens mid-play, not in the lead.
    await until(
      () => epochNowMs() > (before.startEpochMs ?? 0) + 100,
      "past the downbeat",
    );

    const tBefore = epochNowMs();
    a.setBpm(180);
    await until(() => b.state.bpm === 180, "follower adopting rebase");
    const tAfter = epochNowMs();
    const after = b.state;
    expect(after).toEqual(a.state);
    expect(after.playing).toBe(true);

    // The old and new grids are lines in (time, beats); phase continuity
    // means they intersect exactly at the conductor's decision instant.
    const b1 = beatMs(before.bpm);
    const b2 = beatMs(after.bpm);
    const s1 = before.startEpochMs!;
    const s2 = after.startEpochMs!;
    // Stable form of (s1 * b2 - s2 * b1) / (b2 - b1): the raw products are
    // ~5e14 (epoch ms times beat ms), where double cancellation costs ~2e-3ms
    // and pushes the beat comparison below past its 1e-6 tolerance.
    const decisionInstant = s1 - (b1 * (s2 - s1)) / (b2 - b1);
    expect(decisionInstant).toBeGreaterThanOrEqual(tBefore - 10);
    expect(decisionInstant).toBeLessThanOrEqual(tAfter + 10);
    expect(beatsAt(after, decisionInstant)!).toBeCloseTo(
      beatsAt(before, decisionInstant)!,
      6,
    );
  });
});
