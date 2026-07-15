/**
 * Unit tests for applyPresetDocument, the commit half of the pipeline.
 *
 * The engine module is mocked (vi.mock) so these run in the node project:
 * apply's contract is store-level (conversion before the first write, the
 * legacy setter order, the cleanPreset dirty baseline); bridge-to-engine
 * propagation is covered by the browser and e2e suites.
 */

import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { PresetDocument } from "./document";

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
let applyPresetDocument: typeof import("./apply").applyPresetDocument;
let decodePresetFileText: typeof import("./decode").decodePresetFileText;
let encodePresetDocument: typeof import("./encode").encodePresetDocument;
let UnknownKitError: typeof import("./errors").UnknownKitError;
let migrateV1ToDocument: typeof import("./migrate-v1").migrateV1ToDocument;
let parsePresetFileV1: typeof import("./parse").parsePresetFileV1;
let useInstrumentsStore: typeof import("@/features/instrument/store/use-instruments-store").useInstrumentsStore;
let useMasterChainStore: typeof import("@/features/master-bus/store/use-master-chain-store").useMasterChainStore;
let usePresetMetaStore: typeof import("@/features/preset/store/use-preset-meta-store").usePresetMetaStore;
let usePatternStore: typeof import("@/features/sequencer/store/use-pattern-store").usePatternStore;
let useTransportStore: typeof import("@/features/transport/store/use-transport-store").useTransportStore;

function readFixture(name: string): string {
  return readFileSync(
    new URL(`./__fixtures__/${name}`, import.meta.url),
    "utf-8",
  );
}

function migrateFixture(name: string): PresetDocument {
  return migrateV1ToDocument(parsePresetFileV1(readFixture(name)));
}

const ERA_FIXTURES = [
  "v1-current.json",
  "v1-legacy-params.json",
  "v1-legacy-master.json",
  "v1-legacy-cycle.json",
  "v1-legacy-pattern-array.json",
];

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
    mode: pattern.mode,
    isPlaying: transport.isPlaying,
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
  // zustand's persist middleware expects a Web Storage; give it an
  // in-memory stub so the store modules can be imported under node.
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });

  ({ applyPresetDocument } = await import("./apply"));
  ({ decodePresetFileText } = await import("./decode"));
  ({ encodePresetDocument } = await import("./encode"));
  ({ UnknownKitError } = await import("./errors"));
  ({ migrateV1ToDocument } = await import("./migrate-v1"));
  ({ parsePresetFileV1 } = await import("./parse"));
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
    mode: defaults.mode,
    voiceIndex: 0,
  });
  useTransportStore.setState({
    isPlaying: defaults.isPlaying,
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

describe("applyPresetDocument", () => {
  it("commits a migrated fixture document to every store", () => {
    const document = migrateFixture("v1-current.json");
    applyPresetDocument(document);

    // Sequencer: pattern and playback land as-is.
    const pattern = usePatternStore.getState();
    expect(pattern.pattern).toEqual(document.pattern);
    expect(pattern.chain).toEqual({ steps: [{ variation: 0, repeats: 1 }] });
    expect(pattern.chainEnabled).toBe(false);
    expect(pattern.variation).toBe(0);
    expect(pattern.mode).toEqual({ type: "voice", voiceIndex: 0 });

    // Transport: bpm raw, swing knob = inverse of the engine fraction.
    const transport = useTransportStore.getState();
    expect(transport.bpm).toBe(100);
    expect(transport.swing).toBe(0);

    // Master: knob values recovered from the golden domain surface.
    const master = useMasterChainStore.getState();
    expect(master.filter).toBe(50);
    expect(master.compThreshold).toBeCloseTo(100, 6); // 0 dB
    expect(master.compRatio).toBeCloseTo(400 / 7, 9); // ratio 5:1
    expect(master.compAttack).toBeCloseTo(50, 6);
    expect(master.compMix).toBeCloseTo(70, 6);
    expect(master.masterVolume).toBeCloseTo(92, 6); // 0 dB

    // Instruments: registry kit-0 rehydrated, knob params inverted.
    const instruments = useInstrumentsStore.getState().instruments;
    expect(instruments).toHaveLength(8);
    const params = instruments[0].params;
    expect(params.decay).toBeCloseTo(100, 6); // 5 s
    expect(params.filter).toBe(50);
    expect(params.volume).toBeCloseTo(92, 6); // 0 dB
    expect(params.pan).toBeCloseTo(50, 6);
    expect(params.tune).toBeCloseTo(50, 6); // 0 semitones
    expect(params.solo).toBe(false);
    expect(params.mute).toBe(false);

    // Meta: current meta and the clean baseline point at the loaded preset.
    const meta = usePresetMetaStore.getState();
    expect(meta.currentPresetMeta.id).toBe(document.meta.id);
    expect(meta.currentKitMeta.id).toBe("kit-0");
    expect(meta.currentKitMeta.name).toBe("808");
    expect(meta.cleanPreset?.meta.id).toBe(document.meta.id);
    expect(meta.cleanPreset?.kit.instruments).toBe(instruments);
  });

  it("stops playback before committing (the kit swap reloads samples)", () => {
    useTransportStore.setState({ isPlaying: true });
    applyPresetDocument(migrateFixture("v1-current.json"));
    expect(useTransportStore.getState().isPlaying).toBe(false);
    expect(engineMock.stop).toHaveBeenCalledTimes(1);
  });

  it("derives the initial variation from chain step 0 (decision 7)", () => {
    const base = migrateFixture("v1-current.json");
    const document: PresetDocument = {
      ...base,
      playback: {
        chain: {
          steps: [
            { variation: 2, repeats: 2 },
            { variation: 1, repeats: 1 },
          ],
        },
        chainEnabled: true,
      },
    };
    applyPresetDocument(document);

    const pattern = usePatternStore.getState();
    expect(pattern.variation).toBe(2);
    expect(pattern.chain).toEqual(document.playback.chain);
    expect(pattern.chainEnabled).toBe(true);
  });

  it("registers a non-factory preset in the library exactly once", () => {
    const base = migrateFixture("v1-current.json");
    const document: PresetDocument = {
      ...base,
      meta: { ...base.meta, id: "custom-apply-test", name: "Custom" },
    };
    applyPresetDocument(document);
    applyPresetDocument(document);

    const { customPresets } = usePresetMetaStore.getState();
    expect(customPresets).toHaveLength(1);
    expect(customPresets[0].meta.id).toBe("custom-apply-test");
  });

  it("does not add factory presets to the library", () => {
    // v1-current.json carries the init preset's factory id.
    applyPresetDocument(migrateFixture("v1-current.json"));
    expect(usePresetMetaStore.getState().customPresets).toHaveLength(0);
  });

  it("leaves every store untouched when the kit id is unknown", () => {
    useTransportStore.setState({ isPlaying: true });
    const before = snapshotStores();

    const orphaned: PresetDocument = {
      ...migrateFixture("v1-current.json"),
      kit: { id: "kit-404" },
    };
    expect(() => applyPresetDocument(orphaned)).toThrow(UnknownKitError);

    expect(snapshotStores()).toEqual(before);
    // Conversion failed before the commit phase: playback was not stopped.
    expect(engineMock.stop).not.toHaveBeenCalled();
  });
});

describe("dirty-detection invariant", () => {
  // The store payloads and the cleanPreset baseline are fields of ONE
  // documentToV1 result, so hasUnsavedChanges() (a JSON comparison of a
  // fresh knob-space store read against cleanPreset) must be false the
  // instant a preset finishes loading. Two separate conversions could
  // disagree in float noise; this pins that they never diverge.
  it.each(ERA_FIXTURES)("%s loads clean through the v1 import path", (name) => {
    applyPresetDocument(migrateFixture(name));
    expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it.each(ERA_FIXTURES)(
    "%s loads clean through the v2 import path (decode of encoded text)",
    (name) => {
      const document = decodePresetFileText(
        encodePresetDocument(migrateFixture(name)),
      );
      applyPresetDocument(document);
      expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
    },
  );

  it("still detects edits made after the load (not vacuously clean)", () => {
    applyPresetDocument(migrateFixture("v1-current.json"));
    expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);

    useTransportStore.getState().setBpm(133);
    expect(usePresetMetaStore.getState().hasUnsavedChanges()).toBe(true);
  });
});
