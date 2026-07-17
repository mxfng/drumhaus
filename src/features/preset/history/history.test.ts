/**
 * Integration tests for undo/redo capture and restore against the real
 * stores (engine mocked, like apply.test.ts): debounce coalescing, gesture
 * bracketing, restore semantics (playback/selection/dirty baseline
 * preserved), and undo across a preset load.
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

import type { PresetDocument } from "@/features/preset/document";

const engineMock = vi.hoisted(() => ({
  play: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  stop: vi.fn(),
  setTempo: vi.fn(),
  setSwing: vi.fn(),
}));

vi.mock("@/core/audio/engine", () => ({
  getAudioEngine: () => engineMock,
}));

// Everything store-adjacent is imported dynamically in beforeAll, after the
// localStorage stub is in place for zustand's persist middleware.
let applyPresetDocument: typeof import("@/features/preset/document/apply").applyPresetDocument;
let snapshotPresetDocument: typeof import("@/features/preset/document/snapshot").snapshotPresetDocument;
let history: typeof import("./history");
let useHistoryStore: typeof import("./use-history-store").useHistoryStore;
let useInstrumentsStore: typeof import("@/features/instrument/store/use-instruments-store").useInstrumentsStore;
let useMasterChainStore: typeof import("@/features/master-bus/store/use-master-chain-store").useMasterChainStore;
let usePresetMetaStore: typeof import("@/features/preset/store/use-preset-meta-store").usePresetMetaStore;
let usePatternStore: typeof import("@/features/sequencer/store/use-pattern-store").usePatternStore;
let useTransportStore: typeof import("@/features/transport/store/use-transport-store").useTransportStore;

interface Defaults {
  instruments: ReturnType<typeof useInstrumentsStore.getState>["instruments"];
  pattern: ReturnType<typeof usePatternStore.getState>["pattern"];
  variation: ReturnType<typeof usePatternStore.getState>["variation"];
  chain: ReturnType<typeof usePatternStore.getState>["chain"];
  chainEnabled: boolean;
  mode: ReturnType<typeof usePatternStore.getState>["mode"];
  bpm: number;
  swing: number;
  master: Record<string, unknown>;
  currentPresetMeta: ReturnType<
    typeof usePresetMetaStore.getState
  >["currentPresetMeta"];
  currentKitMeta: ReturnType<
    typeof usePresetMetaStore.getState
  >["currentKitMeta"];
}

let defaults: Defaults;
let disposeCapture: (() => void) | null = null;

/** Advance past the trailing commit debounce. */
function settle(): void {
  vi.advanceTimersByTime(history.HISTORY_COMMIT_DEBOUNCE_MS + 10);
}

function pastLength(): number {
  return useHistoryStore.getState().past.length;
}

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });

  ({ applyPresetDocument } = await import("@/features/preset/document/apply"));
  ({ snapshotPresetDocument } =
    await import("@/features/preset/document/snapshot"));
  history = await import("./history");
  ({ useHistoryStore } = await import("./use-history-store"));
  ({ useInstrumentsStore } =
    await import("@/features/instrument/store/use-instruments-store"));
  ({ useMasterChainStore } =
    await import("@/features/master-bus/store/use-master-chain-store"));
  ({ usePresetMetaStore } =
    await import("@/features/preset/store/use-preset-meta-store"));
  ({ usePatternStore } =
    await import("@/features/sequencer/store/use-pattern-store"));
  ({ useTransportStore } =
    await import("@/features/transport/store/use-transport-store"));

  const pattern = usePatternStore.getState();
  const transport = useTransportStore.getState();
  const meta = usePresetMetaStore.getState();
  defaults = {
    instruments: useInstrumentsStore.getState().instruments,
    pattern: pattern.pattern,
    variation: pattern.variation,
    chain: pattern.chain,
    chainEnabled: pattern.chainEnabled,
    mode: pattern.mode,
    bpm: transport.bpm,
    swing: transport.swing,
    master: {
      filter: useMasterChainStore.getState().filter,
      saturation: useMasterChainStore.getState().saturation,
      phaser: useMasterChainStore.getState().phaser,
      reverb: useMasterChainStore.getState().reverb,
      compThreshold: useMasterChainStore.getState().compThreshold,
      compRatio: useMasterChainStore.getState().compRatio,
      compAttack: useMasterChainStore.getState().compAttack,
      compMix: useMasterChainStore.getState().compMix,
      masterVolume: useMasterChainStore.getState().masterVolume,
    },
    currentPresetMeta: meta.currentPresetMeta,
    currentKitMeta: meta.currentKitMeta,
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();

  useInstrumentsStore.setState({ instruments: defaults.instruments });
  usePatternStore.setState({
    pattern: defaults.pattern,
    variation: defaults.variation,
    chain: defaults.chain,
    chainEnabled: defaults.chainEnabled,
    mode: defaults.mode,
    voiceIndex: 0,
  });
  useTransportStore.setState({
    isPlaying: false,
    bpm: defaults.bpm,
    swing: defaults.swing,
  });
  useMasterChainStore.setState(defaults.master);
  usePresetMetaStore.setState({
    currentPresetMeta: defaults.currentPresetMeta,
    currentKitMeta: defaults.currentKitMeta,
    cleanHash: null,
    customPresets: [],
  });
  useHistoryStore.setState({
    past: [],
    present: null,
    presentHash: null,
    future: [],
  });

  disposeCapture = history.startHistoryCapture();
});

afterEach(() => {
  disposeCapture?.();
  disposeCapture = null;
  vi.useRealTimers();
});

describe("capture", () => {
  it("coalesces a burst of writes into one entry", () => {
    useTransportStore.getState().setBpm(120);
    useTransportStore.getState().setBpm(125);
    useTransportStore.getState().setSwing(0.1);
    settle();

    expect(pastLength()).toBe(1);
    expect(useHistoryStore.getState().present?.transport.bpm).toBe(125);
  });

  it("records separate settled actions as separate entries", () => {
    useTransportStore.getState().setBpm(120);
    settle();
    usePatternStore.getState().toggleStep(0, 0, 0);
    settle();

    expect(pastLength()).toBe(2);
  });

  it("ignores non-document store changes", () => {
    usePatternStore.getState().setVariation(2);
    usePatternStore.getState().setPlaybackVariation(3);
    settle();

    expect(pastLength()).toBe(0);
  });

  it("brackets a gesture into one entry regardless of pauses", () => {
    history.beginHistoryGesture();
    useTransportStore.getState().setBpm(121);
    settle();
    useTransportStore.getState().setBpm(122);
    settle();
    useTransportStore.getState().setBpm(123);
    history.endHistoryGesture();
    settle();

    expect(pastLength()).toBe(1);
    expect(useHistoryStore.getState().present?.transport.bpm).toBe(123);
  });

  it("folds a commit scheduled before the gesture opened into its end-commit", () => {
    // A velocity scrub's pointer-down write lands before the gesture-open
    // effect runs; the pending timer must not commit a mid-drag state.
    useTransportStore.getState().setBpm(121);
    history.beginHistoryGesture();
    settle();
    useTransportStore.getState().setBpm(122);
    history.endHistoryGesture();
    settle();

    expect(pastLength()).toBe(1);
    expect(useHistoryStore.getState().present?.transport.bpm).toBe(122);
  });
});

describe("undo / redo", () => {
  it("restores the previous state, including a pending uncommitted edit", () => {
    useTransportStore.getState().setBpm(140);
    // No settle(): undo must flush the pending commit before stepping.
    history.undo();

    expect(useTransportStore.getState().bpm).toBe(defaults.bpm);
    expect(useHistoryStore.getState().future).toHaveLength(1);

    history.redo();
    expect(useTransportStore.getState().bpm).toBe(140);
  });

  it("keeps playback running and the selection in place (same kit)", () => {
    usePatternStore.getState().setVariation(2);
    useTransportStore.setState({ isPlaying: true });
    useTransportStore.getState().setBpm(150);
    settle();

    history.undo();

    expect(useTransportStore.getState().bpm).toBe(defaults.bpm);
    expect(useTransportStore.getState().isPlaying).toBe(true);
    expect(engineMock.stop).not.toHaveBeenCalled();
    expect(usePatternStore.getState().variation).toBe(2);
  });

  it("does not touch the clean dirty baseline", () => {
    usePresetMetaStore.getState().markPresetClean();
    const baseline = usePresetMetaStore.getState().cleanHash;

    useTransportStore.getState().setBpm(150);
    settle();
    expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(true);

    history.undo();
    expect(usePresetMetaStore.getState().cleanHash).toBe(baseline);
    expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it("does not grow history from its own restore writes", () => {
    useTransportStore.getState().setBpm(150);
    settle();
    expect(pastLength()).toBe(1);

    history.undo();
    settle();

    expect(pastLength()).toBe(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);
  });

  it("clears the future when a new edit lands after undo", () => {
    useTransportStore.getState().setBpm(150);
    settle();
    history.undo();
    expect(useHistoryStore.getState().future).toHaveLength(1);

    useTransportStore.getState().setBpm(90);
    settle();
    expect(useHistoryStore.getState().future).toHaveLength(0);
  });

  it("undoes a whole preset load as one step, identity included", () => {
    const base: PresetDocument = snapshotPresetDocument(
      defaults.currentPresetMeta,
      defaults.currentKitMeta,
    );
    const loaded: PresetDocument = {
      ...base,
      meta: { ...base.meta, id: "history-load-test", name: "Loaded" },
      transport: { ...base.transport, bpm: 155 },
    };

    applyPresetDocument(loaded);
    settle();
    expect(pastLength()).toBe(1);
    expect(useTransportStore.getState().bpm).toBe(155);

    history.undo();
    expect(useTransportStore.getState().bpm).toBe(defaults.bpm);
    expect(usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      defaults.currentPresetMeta.id,
    );

    history.redo();
    expect(useTransportStore.getState().bpm).toBe(155);
    expect(usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      "history-load-test",
    );
  });

  it("no-ops with nothing to undo or redo", () => {
    const before = useTransportStore.getState().bpm;
    history.undo();
    history.redo();
    expect(useTransportStore.getState().bpm).toBe(before);
    expect(pastLength()).toBe(0);
  });
});
