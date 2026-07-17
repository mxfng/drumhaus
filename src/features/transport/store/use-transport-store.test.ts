/**
 * Unit tests for the transport store's togglePlay concurrency semantics.
 *
 * The engine module is mocked (vi.mock) so these run in the node project:
 * they verify STORE-level toggle behavior - the synchronous optimistic
 * flip that makes a rapid double-tap land on stop, and the rollback when
 * engine.play() rejects. Engine-side supersession (intentSeq) is covered
 * separately by the browser tests.
 */

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { setLocalStartSuppressed } from "./local-start-control";

const engineMock = vi.hoisted(() => ({
  play: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  stop: vi.fn(),
  setTempo: vi.fn(),
  setSwing: vi.fn(),
}));

vi.mock("@/core/audio/engine", () => ({
  getAudioEngine: () => engineMock,
}));

let useTransportStore: typeof import("./use-transport-store").useTransportStore;

beforeAll(async () => {
  ({ useTransportStore } = await import("./use-transport-store"));
});

beforeEach(() => {
  vi.clearAllMocks();
  engineMock.play.mockImplementation(() => Promise.resolve());
  useTransportStore.setState({ isPlaying: false });
});

afterEach(() => {
  setLocalStartSuppressed(false);
});

describe("togglePlay", () => {
  it("flips isPlaying synchronously so a double-tap lands on stop", async () => {
    // engine.play() resolves only when told to, simulating the async
    // context unlock during which the second tap arrives.
    let resolvePlay!: () => void;
    engineMock.play.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePlay = resolve;
        }),
    );

    const firstTap = useTransportStore.getState().togglePlay();
    expect(useTransportStore.getState().isPlaying).toBe(true);

    const secondTap = useTransportStore.getState().togglePlay();
    expect(useTransportStore.getState().isPlaying).toBe(false);
    expect(engineMock.stop).toHaveBeenCalledTimes(1);

    resolvePlay();
    await Promise.all([firstTap, secondTap]);

    // The first tap's resolution must not overwrite the second tap's stop.
    expect(useTransportStore.getState().isPlaying).toBe(false);
    expect(engineMock.play).toHaveBeenCalledTimes(1);
  });

  it("rolls back isPlaying when engine.play() rejects", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    engineMock.play.mockRejectedValueOnce(new Error("context unavailable"));

    await useTransportStore.getState().togglePlay();

    expect(useTransportStore.getState().isPlaying).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not push tempo/swing itself; engine.play() re-applies them", async () => {
    await useTransportStore.getState().togglePlay();

    expect(engineMock.play).toHaveBeenCalledTimes(1);
    expect(engineMock.setTempo).not.toHaveBeenCalled();
    expect(engineMock.setSwing).not.toHaveBeenCalled();
  });

  it("while linked, leaves starting the engine to the session adapter (#425)", async () => {
    setLocalStartSuppressed(true);

    // Play: the store flips optimistically (the adapter sees the flip via
    // its subscription and schedules the grid-aligned start), but the
    // immediate engine start is suppressed - it would sound ahead of the
    // shared downbeat and then be restarted onto it.
    await useTransportStore.getState().togglePlay();
    expect(useTransportStore.getState().isPlaying).toBe(true);
    expect(engineMock.play).not.toHaveBeenCalled();

    // Stop stays immediate while linked.
    await useTransportStore.getState().togglePlay();
    expect(useTransportStore.getState().isPlaying).toBe(false);
    expect(engineMock.stop).toHaveBeenCalledTimes(1);
  });
});
