/**
 * Rehydration tests for the transport store's persist migration (#269).
 *
 * Pre-retune localStorage (persist version 0) stores swing knob values
 * written under the old curve (Tone swing = knob / 200); the version-1
 * migrate rescales them (k * 4/3, clamped) so the persisted feel survives
 * the retune. The engine module is mocked so this runs in the node project.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { transportSwingKnobToDomain } from "@/core/audio/bridge/knob-to-domain";

const engineMock = vi.hoisted(() => ({
  play: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  stop: vi.fn(),
  setTempo: vi.fn(),
  setSwing: vi.fn(),
}));

vi.mock("@/core/audio/engine", () => ({
  getAudioEngine: () => engineMock,
}));

function stubStoredTransport(payload: unknown): void {
  const storage = {
    getItem: (key: string) =>
      key === "drumhaus-transport-storage" ? JSON.stringify(payload) : null,
    setItem: () => {},
    removeItem: () => {},
  };
  // zustand's persist default storage reads window.localStorage, so the
  // node project needs a window stub carrying the fake storage.
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
}

async function importFreshStore() {
  vi.resetModules();
  const { useTransportStore } = await import("./use-transport-store");
  return useTransportStore;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("transport persist migration (#269 swing retune)", () => {
  it("rescales a version-0 swing knob value by 4/3 on rehydrate", async () => {
    stubStoredTransport({ state: { bpm: 128, swing: 48 }, version: 0 });

    const store = await importFreshStore();

    expect(store.getState().bpm).toBe(128);
    expect(store.getState().swing).toBe(64);
    // onRehydrateStorage pushes the MIGRATED value into the engine.
    expect(engineMock.setSwing).toHaveBeenCalledWith(
      transportSwingKnobToDomain(64),
    );
  });

  it("clamps a version-0 swing above 75 to knob 100", async () => {
    stubStoredTransport({ state: { bpm: 120, swing: 90 }, version: 0 });

    const store = await importFreshStore();

    expect(store.getState().swing).toBe(100);
  });

  it("leaves version-1 state untouched", async () => {
    stubStoredTransport({ state: { bpm: 120, swing: 64 }, version: 1 });

    const store = await importFreshStore();

    expect(store.getState().swing).toBe(64);
  });
});
