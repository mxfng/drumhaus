/**
 * Conductor election over an injectable lock manager: FIFO acquisition,
 * handoff on stop, withdrawn requests never acquiring, and the solo fallback
 * when no Web Locks API exists at all.
 */

import { describe, expect, it } from "vitest";

import { createConductorElection } from "../election";
import { flushMicrotasks, memoryLocks } from "./helpers/memory-locks";

describe("createConductorElection", () => {
  it("grants the first requester", async () => {
    const locks = memoryLocks();
    let acquired = 0;
    const election = createConductorElection({
      locks,
      onAcquired: () => acquired++,
    });
    election.start();
    await flushMicrotasks();
    expect(acquired).toBe(1);
    election.stop();
  });

  it("queues a second requester until the holder stops", async () => {
    const locks = memoryLocks();
    let first = 0;
    let second = 0;
    const a = createConductorElection({ locks, onAcquired: () => first++ });
    const b = createConductorElection({ locks, onAcquired: () => second++ });
    a.start();
    await flushMicrotasks();
    b.start();
    await flushMicrotasks();
    expect(first).toBe(1);
    expect(second).toBe(0);

    a.stop();
    await flushMicrotasks();
    expect(second).toBe(1);
    b.stop();
  });

  it("never grants a request withdrawn while pending", async () => {
    const locks = memoryLocks();
    let second = 0;
    const a = createConductorElection({ locks, onAcquired: () => {} });
    const b = createConductorElection({ locks, onAcquired: () => second++ });
    a.start();
    await flushMicrotasks();
    b.start();
    b.stop();
    a.stop();
    await flushMicrotasks();
    expect(second).toBe(0);
  });

  it("is idempotent while running", async () => {
    const locks = memoryLocks();
    let acquired = 0;
    const election = createConductorElection({
      locks,
      onAcquired: () => acquired++,
    });
    election.start();
    election.start();
    await flushMicrotasks();
    expect(acquired).toBe(1);
    election.stop();
    election.stop();
  });

  it("falls back to solo conductorship without a Web Locks API", async () => {
    // No injected locks and (in node) no usable navigator.locks: the
    // documented degradation is that this peer conducts itself immediately.
    let acquired = 0;
    const election = createConductorElection({ onAcquired: () => acquired++ });
    election.start();
    await flushMicrotasks();
    expect(acquired).toBe(1);
    election.stop();
  });
});
