/**
 * Unit tests for the session autosave writer: debounce collapsing, the
 * pagehide/hidden flush (decision 6: autosave IS the tab-close protection),
 * envelope round-tripping, and the warn-once failure posture.
 *
 * Drives startSessionAutosave (the plain core the useSessionAutosave hook
 * mounts) with fake timers and stubbed window/document event targets. The
 * engine module is mocked so the suite runs in the node project.
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

const engineMock = vi.hoisted(() => ({
  play: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  stop: vi.fn(),
  setTempo: vi.fn(),
  setSwing: vi.fn(),
}));

vi.mock("@/core/audio/engine", () => ({
  getAudioEngine: () => engineMock,
}));

const SESSION_KEY = "drumhaus-session";

type Listener = () => void;

const store = new Map<string, string>();
let failWrites = false;
let sessionWriteCount = 0;
const windowListeners = new Map<string, Set<Listener>>();
const documentListeners = new Map<string, Set<Listener>>();
let visibilityState: "visible" | "hidden" = "visible";

function addListener(map: Map<string, Set<Listener>>) {
  return (type: string, listener: Listener) => {
    if (!map.has(type)) map.set(type, new Set());
    map.get(type)!.add(listener);
  };
}

function removeListener(map: Map<string, Set<Listener>>) {
  return (type: string, listener: Listener) => {
    map.get(type)?.delete(listener);
  };
}

function fire(map: Map<string, Set<Listener>>, type: string): void {
  for (const listener of map.get(type) ?? []) listener();
}

// Store-adjacent modules are imported dynamically in beforeAll, after the
// stubs are in place.
let startSessionAutosave: typeof import("./use-session-autosave").startSessionAutosave;
let SESSION_AUTOSAVE_DEBOUNCE_MS: typeof import("./use-session-autosave").SESSION_AUTOSAVE_DEBOUNCE_MS;
let readSessionEnvelope: typeof import("./session-storage").readSessionEnvelope;
let useTransportStore: typeof import("@/features/transport/store/use-transport-store").useTransportStore;
let usePresetMetaStore: typeof import("@/features/preset/store/use-preset-meta-store").usePresetMetaStore;

let dispose: (() => void) | null = null;

beforeAll(async () => {
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (failWrites) throw new Error("quota exceeded");
      if (key === SESSION_KEY) sessionWriteCount += 1;
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    localStorage: storage,
    addEventListener: addListener(windowListeners),
    removeEventListener: removeListener(windowListeners),
  });
  vi.stubGlobal("document", {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: addListener(documentListeners),
    removeEventListener: removeListener(documentListeners),
  });

  ({ startSessionAutosave, SESSION_AUTOSAVE_DEBOUNCE_MS } =
    await import("./use-session-autosave"));
  ({ readSessionEnvelope } = await import("./session-storage"));
  ({ useTransportStore } =
    await import("@/features/transport/store/use-transport-store"));
  ({ usePresetMetaStore } =
    await import("@/features/preset/store/use-preset-meta-store"));
});

beforeEach(() => {
  vi.useFakeTimers();
  store.clear();
  failWrites = false;
  sessionWriteCount = 0;
  visibilityState = "visible";
  useTransportStore.setState({ bpm: 100, swing: 0, isPlaying: false });
});

afterEach(() => {
  dispose?.();
  dispose = null;
  vi.useRealTimers();
});

describe("startSessionAutosave", () => {
  it("collapses rapid edits into one trailing write after the debounce", () => {
    dispose = startSessionAutosave();

    useTransportStore.getState().setBpm(120);
    useTransportStore.getState().setBpm(130);
    useTransportStore.getState().setBpm(140);

    // Nothing yet: the writer is trailing-debounced.
    expect(sessionWriteCount).toBe(0);

    vi.advanceTimersByTime(SESSION_AUTOSAVE_DEBOUNCE_MS);
    expect(sessionWriteCount).toBe(1);

    const read = readSessionEnvelope();
    expect(read.status).toBe("ok");
    if (read.status === "ok") {
      expect(read.envelope.document.transport.bpm).toBe(140);
      expect(read.envelope.cleanHash).toBe(
        usePresetMetaStore.getState().cleanHash,
      );
    }
  });

  it("flushes a pending write immediately on pagehide", () => {
    dispose = startSessionAutosave();

    useTransportStore.getState().setBpm(133);
    expect(sessionWriteCount).toBe(0);

    fire(windowListeners, "pagehide");
    expect(sessionWriteCount).toBe(1);

    const read = readSessionEnvelope();
    expect(read.status).toBe("ok");
    if (read.status === "ok") {
      expect(read.envelope.document.transport.bpm).toBe(133);
    }

    // The flushed timer does not fire a duplicate write later.
    vi.advanceTimersByTime(SESSION_AUTOSAVE_DEBOUNCE_MS * 2);
    expect(sessionWriteCount).toBe(1);
  });

  it("flushes a pending write when the tab becomes hidden", () => {
    dispose = startSessionAutosave();

    useTransportStore.getState().setBpm(90);
    visibilityState = "hidden";
    fire(documentListeners, "visibilitychange");

    expect(sessionWriteCount).toBe(1);
  });

  it("does not flush on visibilitychange while still visible", () => {
    dispose = startSessionAutosave();

    useTransportStore.getState().setBpm(90);
    fire(documentListeners, "visibilitychange");

    expect(sessionWriteCount).toBe(0);
  });

  it("warns once on storage failure instead of throwing per keystroke", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    failWrites = true;
    dispose = startSessionAutosave();

    useTransportStore.getState().setBpm(101);
    vi.advanceTimersByTime(SESSION_AUTOSAVE_DEBOUNCE_MS);
    useTransportStore.getState().setBpm(102);
    vi.advanceTimersByTime(SESSION_AUTOSAVE_DEBOUNCE_MS);

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    consoleWarn.mockRestore();
  });

  it("stops writing after dispose", () => {
    dispose = startSessionAutosave();
    dispose();
    dispose = null;

    useTransportStore.getState().setBpm(150);
    vi.advanceTimersByTime(SESSION_AUTOSAVE_DEBOUNCE_MS * 2);

    expect(sessionWriteCount).toBe(0);
  });
});
