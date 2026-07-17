/**
 * Unit tests for the recovery-tier counters (issue #319): increments and
 * persistence shape, versioned resets, and storage-failure tolerance -
 * counting must fail silent so recovery still runs without storage.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getRecoveryStats,
  recordRecoveryEvent,
  RECOVERY_STATS_STORAGE_KEY,
} from "./recovery-stats";

/** In-memory Web Storage stub; returns the backing map for assertions. */
function stubStorage(
  initial: Record<string, string> = {},
): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recovery stats", () => {
  it("starts zeroed when nothing is persisted", () => {
    stubStorage();

    const stats = getRecoveryStats();

    expect(Object.values(stats.counters)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(stats.lastEventAt).toEqual({});
  });

  it("increments counters and persists a versioned payload", () => {
    const store = stubStorage();

    recordRecoveryEvent("stallDetected");
    recordRecoveryEvent("rebuildAttempt");
    recordRecoveryEvent("rebuildAttempt");

    const stats = getRecoveryStats();
    expect(stats.counters.stallDetected).toBe(1);
    expect(stats.counters.rebuildAttempt).toBe(2);
    expect(stats.lastEventAt.rebuildAttempt).toBeTypeOf("number");

    const persisted = JSON.parse(store.get(RECOVERY_STATS_STORAGE_KEY)!);
    expect(persisted.version).toBe(1);
    expect(persisted.counters.rebuildAttempt).toBe(2);
  });

  it("fills in counters missing from an older same-version payload", () => {
    stubStorage({
      [RECOVERY_STATS_STORAGE_KEY]: JSON.stringify({
        version: 1,
        counters: { reloadFallback: 3 },
      }),
    });

    const stats = getRecoveryStats();

    expect(stats.counters.reloadFallback).toBe(3);
    expect(stats.counters.rebuildAttempt).toBe(0);
  });

  it("resets on version mismatch and on corrupt payloads", () => {
    stubStorage({
      [RECOVERY_STATS_STORAGE_KEY]: JSON.stringify({
        version: 0,
        counters: { reloadFallback: 9 },
      }),
    });
    expect(getRecoveryStats().counters.reloadFallback).toBe(0);

    stubStorage({ [RECOVERY_STATS_STORAGE_KEY]: "not json" });
    expect(getRecoveryStats().counters.reloadFallback).toBe(0);
  });

  it("fails silent when storage throws or is missing entirely", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    expect(() => recordRecoveryEvent("reloadFallback")).not.toThrow();
    expect(getRecoveryStats().counters.reloadFallback).toBe(0);

    vi.stubGlobal("localStorage", undefined);
    expect(() => recordRecoveryEvent("reloadFallback")).not.toThrow();
    expect(getRecoveryStats().counters.reloadFallback).toBe(0);
  });
});
