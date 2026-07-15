/**
 * Entry-point integration tests for the preset load boundary in
 * use-preset-loading.ts. The module-level functions under test are exactly
 * what the hook binds to the toast context, so these exercise the real
 * decode -> apply path (file import) and validate -> migrate -> apply path
 * (library select) with a mock toast, without rendering React.
 *
 * The engine module is mocked so the suite runs in the node project.
 */

import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { PresetFileV1 } from "@/features/preset/types/preset";

const engineMock = vi.hoisted(() => ({
  play: vi.fn<() => Promise<void>>(() => Promise.resolve()),
  stop: vi.fn(),
  setTempo: vi.fn(),
  setSwing: vi.fn(),
}));

vi.mock("@/core/audio/engine", () => ({
  getAudioEngine: () => engineMock,
}));

// Store-adjacent modules are imported dynamically in beforeAll, after the
// localStorage stub is in place for zustand's persist middleware.
let init: typeof import("@/core/dh").init;
let encodePresetDocument: typeof import("@/features/preset/document").encodePresetDocument;
let migrateV1ToDocument: typeof import("@/features/preset/document").migrateV1ToDocument;
let parsePresetFileV1: typeof import("@/features/preset/document").parsePresetFileV1;
let loadPresetFile: typeof import("./use-preset-loading").loadPresetFile;
let loadPresetFileText: typeof import("./use-preset-loading").loadPresetFileText;
let useInstrumentsStore: typeof import("@/features/instrument/store/use-instruments-store").useInstrumentsStore;
let useMasterChainStore: typeof import("@/features/master-bus/store/use-master-chain-store").useMasterChainStore;
let usePresetMetaStore: typeof import("@/features/preset/store/use-preset-meta-store").usePresetMetaStore;
let usePatternStore: typeof import("@/features/sequencer/store/use-pattern-store").usePatternStore;
let useTransportStore: typeof import("@/features/transport/store/use-transport-store").useTransportStore;

function readFixture(name: string): string {
  return readFileSync(
    new URL(`../document/__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

/** The musical store surface, as data (for untouched-stores comparisons). */
function snapshotStores() {
  const pattern = usePatternStore.getState();
  const transport = useTransportStore.getState();
  const master = useMasterChainStore.getState();
  const meta = usePresetMetaStore.getState();
  return {
    instruments: useInstrumentsStore.getState().instruments,
    pattern: pattern.pattern,
    variation: pattern.variation,
    chain: pattern.chain,
    chainEnabled: pattern.chainEnabled,
    bpm: transport.bpm,
    swing: transport.swing,
    master: {
      filter: master.filter,
      saturation: master.saturation,
      phaser: master.phaser,
      reverb: master.reverb,
      compThreshold: master.compThreshold,
      compRatio: master.compRatio,
      compAttack: master.compAttack,
      compMix: master.compMix,
      masterVolume: master.masterVolume,
    },
    currentPresetMeta: meta.currentPresetMeta,
    currentKitMeta: meta.currentKitMeta,
    cleanPreset: meta.cleanPreset,
    customPresets: meta.customPresets,
  };
}

type StoreSnapshot = ReturnType<typeof snapshotStores>;
let defaults: StoreSnapshot;

beforeAll(async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });

  ({ init } = await import("@/core/dh"));
  ({ encodePresetDocument, migrateV1ToDocument, parsePresetFileV1 } =
    await import("@/features/preset/document"));
  ({ loadPresetFile, loadPresetFileText } =
    await import("./use-preset-loading"));
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

  defaults = snapshotStores();
});

beforeEach(() => {
  vi.clearAllMocks();
  useInstrumentsStore.setState({ instruments: defaults.instruments });
  usePatternStore.setState({
    pattern: defaults.pattern,
    variation: defaults.variation,
    chain: defaults.chain,
    chainEnabled: defaults.chainEnabled,
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
    cleanPreset: defaults.cleanPreset,
    customPresets: defaults.customPresets,
  });
});

describe("file import entry point (loadPresetFileText)", () => {
  it("loads v2 .dh text through decode -> apply, ending with stores matching the document", () => {
    const document = migrateV1ToDocument(
      parsePresetFileV1(readFixture("v1-legacy-master.json")),
    );
    const text = encodePresetDocument(document);
    const toast = vi.fn();

    const loaded = loadPresetFileText(text, toast);

    expect(loaded).toEqual(document);
    expect(toast).not.toHaveBeenCalled();

    expect(usePatternStore.getState().pattern).toEqual(document.pattern);
    expect(usePatternStore.getState().chain).toEqual(document.playback.chain);
    expect(useTransportStore.getState().bpm).toBe(document.transport.bpm);
    expect(usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      document.meta.id,
    );
    expect(usePresetMetaStore.getState().currentKitMeta.id).toBe(
      document.kit.id,
    );
    // The freshly imported preset starts clean.
    expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it("toasts the typed error for unreadable text without mutating stores", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const before = snapshotStores();
    const toast = vi.fn();

    const loaded = loadPresetFileText("not json at all", toast);

    expect(loaded).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith({
      title: "Something went wrong",
      description: "Invalid preset file: not valid JSON",
      status: "error",
      duration: 8000,
    });
    expect(snapshotStores()).toEqual(before);
    consoleError.mockRestore();
  });
});

describe("library select entry point (loadPresetFile)", () => {
  it("surfaces a typed error as a toast without mutating stores for a corrupt v1 object", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    // A library entry persisted verbatim in localStorage, damaged in place.
    const corrupt = JSON.parse(JSON.stringify(init())) as Record<
      string,
      { bpm: unknown }
    >;
    corrupt.transport.bpm = "fast";

    const before = snapshotStores();
    const toast = vi.fn();

    const loaded = loadPresetFile(corrupt as unknown as PresetFileV1, toast);

    expect(loaded).toBeNull();
    expect(toast).toHaveBeenCalledTimes(1);
    const toastArgs = toast.mock.calls[0][0] as {
      title: string;
      description: string;
      status: string;
    };
    expect(toastArgs.title).toBe("Something went wrong");
    expect(toastArgs.status).toBe("error");
    // CorruptFieldError carries the offending dot path.
    expect(toastArgs.description).toContain("transport.bpm");

    // The throw happened before the first store write.
    expect(snapshotStores()).toEqual(before);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("loads a valid v1 library object through validate -> migrate -> apply", () => {
    const preset = init();
    const toast = vi.fn();

    const loaded = loadPresetFile(preset, toast);

    expect(loaded).not.toBeNull();
    expect(toast).not.toHaveBeenCalled();
    expect(usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      preset.meta.id,
    );
    expect(useTransportStore.getState().bpm).toBe(preset.transport.bpm);
    expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });
});
