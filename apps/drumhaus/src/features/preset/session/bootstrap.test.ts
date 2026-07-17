/**
 * Boot-path tests for bootstrapSession(): session restore, corrupt-session
 * quarantine, one-time legacy adoption, adoption failure, first visit, and
 * reload-stable dirty tracking.
 *
 * Each scenario boots a fresh module registry (vi.resetModules) against a
 * seeded in-memory localStorage, mirroring a real page load: store modules
 * hydrate their persists at import time, then bootstrapSession() runs
 * before anything else touches the stores. The engine module is mocked so
 * the suite runs in the node project.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { init } from "@/core/dh";
import { loadKit } from "@/core/dhkit";
import { type PresetDocument } from "@/features/preset/document";
import { frozenSplitFilterPositionToCanonical } from "@/features/preset/document/frozen-split-filter";
import { createEmptyPattern } from "@/features/sequencer/lib/helpers";
import { hashPresetDocument } from "./canonical-hash";

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
const QUARANTINE_KEY = "drumhaus-session-quarantine";
const SESSION_UI_KEY = "drumhaus-session-ui";
const INSTRUMENTS_KEY = "drumhaus-instruments-storage";
const SEQUENCER_KEY = "drumhaus-sequencer-storage";
const TRANSPORT_KEY = "drumhaus-transport-storage";
const MASTER_KEY = "drumhaus-master-chain-storage";
const PRESET_META_KEY = "drumhaus-preset-meta-storage";
const LIBRARY_BACKUP_KEY = "drumhaus-library-backup";
const MUSICAL_LEGACY_KEYS = [
  INSTRUMENTS_KEY,
  SEQUENCER_KEY,
  TRANSPORT_KEY,
  MASTER_KEY,
];

interface MemoryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  map: Map<string, string>;
}

function createMemoryStorage(seed: Record<string, string> = {}): MemoryStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    map,
  };
}

/**
 * Simulate a page load: fresh module registry, the given storage installed,
 * store persists hydrating at import time, then bootstrapSession().
 */
async function boot(storage: MemoryStorage) {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });

  const { bootstrapSession } = await import("./bootstrap");
  bootstrapSession();

  const { useInstrumentsStore } =
    await import("@/features/instrument/store/use-instruments-store");
  const { useMasterChainStore } =
    await import("@/features/master-bus/store/use-master-chain-store");
  const { usePresetMetaStore } =
    await import("@/features/preset/store/use-preset-meta-store");
  const { usePatternStore } =
    await import("@/features/sequencer/store/use-pattern-store");
  const { useTransportStore } =
    await import("@/features/transport/store/use-transport-store");
  const { snapshotPresetDocument } =
    await import("@/features/preset/document/snapshot");
  const { writeSessionEnvelope } = await import("./session-storage");

  return {
    storage,
    useInstrumentsStore,
    useMasterChainStore,
    usePresetMetaStore,
    usePatternStore,
    useTransportStore,
    snapshotPresetDocument,
    writeSessionEnvelope,
  };
}

type BootContext = Awaited<ReturnType<typeof boot>>;

/** Write the session envelope exactly as the autosave writer does. */
function autosaveNow(ctx: BootContext): void {
  const { currentPresetMeta, currentKitMeta, cleanHash } =
    ctx.usePresetMetaStore.getState();
  const written = ctx.writeSessionEnvelope(
    ctx.snapshotPresetDocument(currentPresetMeta, currentKitMeta),
    cleanHash,
  );
  expect(written).toBe(true);
}

function initDocument(): PresetDocument {
  return init();
}

/** Distinct v2 filter positions per channel, mirroring migrate-v2.test.ts. */
const V2_CHANNEL_FILTER_POSITIONS = [0, 20, 49, 50, 51, 80, 100, 35];
const V2_MASTER_FILTER_POSITION = 65;

/**
 * A version-2 document (the first domain document, whose split filter was
 * still a 0-100 position), built by downgrading init() to the v2 shape.
 * Mirrors migrate-v2.test.ts's buildV2Document helper.
 */
function buildV2Document(): Record<string, unknown> {
  const v21 = init();
  const channels = v21.channels.map((channel, index) => ({
    ...channel,
    filter: V2_CHANNEL_FILTER_POSITIONS[index],
  }));
  return {
    ...v21,
    version: 2,
    channels,
    master: { ...v21.master, filter: V2_MASTER_FILTER_POSITION },
  };
}

function sessionEnvelopeJson(
  document: PresetDocument,
  cleanHash: string | null,
): string {
  return JSON.stringify({ v: 1, document, cleanHash });
}

/** A full set of legacy envelopes, as an adoptable storage seed. */
function legacySeed(): Record<string, string> {
  // Instruments: v2-era envelope predating the release/pitch -> decay/tune
  // rename (persist version 1).
  const instruments = loadKit("kit-0")!.instruments.map((inst, index) => {
    const { decay, tune, ...rest } = inst.params;
    return {
      ...inst,
      params: {
        ...rest,
        attack: 0,
        release: index === 0 ? 63 : decay,
        pitch: tune,
      },
    };
  });

  // Sequencer: current-version (v3) envelope. The selected pad (2) differs
  // from the chain's first step (1) so the tests can tell the restored
  // selection from the chain-derived default.
  const pattern = createEmptyPattern();
  pattern.voices[0].variations[0].triggers[0] = true;
  pattern.voices[0].variations[0].velocities[0] = 0.75;

  const presetMeta = init().meta;
  const kitMeta = loadKit("kit-0")!.meta;

  return {
    [INSTRUMENTS_KEY]: JSON.stringify({
      state: { instruments },
      version: 1,
    }),
    [SEQUENCER_KEY]: JSON.stringify({
      state: {
        pattern,
        variation: 2,
        chain: { steps: [{ variation: 1, repeats: 2 }] },
        chainEnabled: true,
      },
      version: 3,
    }),
    // Transport: pre-#269 (persist version 0) swing knob.
    [TRANSPORT_KEY]: JSON.stringify({
      state: { bpm: 128, swing: 48 },
      version: 0,
    }),
    [MASTER_KEY]: JSON.stringify({
      state: {
        filter: 25,
        saturation: 10,
        phaser: 5,
        reverb: 33,
        compThreshold: 80,
        compRatio: 40,
        compAttack: 60,
        compMix: 55,
        masterVolume: 88,
      },
      version: 0,
    }),
    [PRESET_META_KEY]: JSON.stringify({
      state: {
        currentPresetMeta: presetMeta,
        currentKitMeta: kitMeta,
        customPresets: [],
      },
      version: 1,
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("bootstrapSession: session restore", () => {
  it("applies the stored document, restores the clean hash, and reads clean", async () => {
    const document = initDocument();
    document.transport.bpm = 111;
    const cleanHash = hashPresetDocument(document);

    const ctx = await boot(
      createMemoryStorage({
        [SESSION_KEY]: sessionEnvelopeJson(document, cleanHash),
        [SESSION_UI_KEY]: JSON.stringify({
          state: { variation: 3 },
          version: 1,
        }),
      }),
    );

    expect(ctx.useTransportStore.getState().bpm).toBe(111);
    expect(ctx.usePatternStore.getState().pattern).toEqual(document.pattern);
    expect(ctx.usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      document.meta.id,
    );

    // The selected pad comes from drumhaus-session-ui, not the chain.
    expect(ctx.usePatternStore.getState().variation).toBe(3);

    // Clean hash restored from the envelope; the restored state reads clean.
    expect(ctx.usePresetMetaStore.getState().cleanHash).toBe(cleanHash);
    expect(ctx.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it("reloads a dirty session as dirty (envelope hash differs from the document)", async () => {
    const document = initDocument();
    document.transport.bpm = 140;
    // The clean baseline points at the pre-edit state, not the document.
    const cleanDocument = initDocument();
    const cleanHash = hashPresetDocument(cleanDocument);

    const ctx = await boot(
      createMemoryStorage({
        [SESSION_KEY]: sessionEnvelopeJson(document, cleanHash),
      }),
    );

    expect(ctx.useTransportStore.getState().bpm).toBe(140);
    expect(ctx.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(true);
  });

  it("restores and migrates a session envelope wrapping a v2 document", async () => {
    // A drumhaus-session written by the v2-era build (between #353 and the 2.1
    // flip in #366): the envelope embeds a version-2 document. It must migrate
    // through decodePresetObject, not read as corrupt (issue #382).
    const envelope = JSON.stringify({
      v: 1,
      document: buildV2Document(),
      cleanHash: null,
    });

    const ctx = await boot(createMemoryStorage({ [SESSION_KEY]: envelope }));

    // Restored, not quarantined: the session key is intact and nothing landed
    // in the quarantine key.
    expect(ctx.storage.map.has(QUARANTINE_KEY)).toBe(false);
    expect(ctx.storage.map.get(SESSION_KEY)).toBe(envelope);

    // The master 0-100 split-filter position migrated to canonical units.
    const canonical = frozenSplitFilterPositionToCanonical(
      V2_MASTER_FILTER_POSITION,
    );
    const master = ctx.useMasterChainStore.getState();
    expect(master.filter.side).toBe(canonical.side);
    expect(master.filter.cutoffHz).toBeCloseTo(canonical.cutoffHz, 6);
  });
});

describe("bootstrapSession: corrupt session", () => {
  it("quarantines the payload, applies init, and leaves legacy keys untouched", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const corruptPayload = "{ not json at all";
    const legacyTransport = JSON.stringify({
      state: { bpm: 128, swing: 48 },
      version: 0,
    });

    const ctx = await boot(
      createMemoryStorage({
        [SESSION_KEY]: corruptPayload,
        [TRANSPORT_KEY]: legacyTransport,
      }),
    );

    // Quarantined, never destroyed; the session key itself is cleared.
    expect(ctx.storage.map.get(QUARANTINE_KEY)).toBe(corruptPayload);
    expect(ctx.storage.map.has(SESSION_KEY)).toBe(false);

    // Legacy keys untouched (no adoption ran).
    expect(ctx.storage.map.get(TRANSPORT_KEY)).toBe(legacyTransport);

    // init applied, clean.
    expect(ctx.useTransportStore.getState().bpm).toBe(init().transport.bpm);
    expect(ctx.usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      init().meta.id,
    );
    expect(ctx.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("quarantines a schema-invalid envelope as well", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const invalidEnvelope = JSON.stringify({ v: 1, document: { nope: true } });

    const ctx = await boot(
      createMemoryStorage({ [SESSION_KEY]: invalidEnvelope }),
    );

    expect(ctx.storage.map.get(QUARANTINE_KEY)).toBe(invalidEnvelope);
    expect(ctx.useTransportStore.getState().bpm).toBe(init().transport.bpm);
    consoleError.mockRestore();
  });

  it("quarantines a session whose document version the ladder cannot read", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    // The envelope shell is well-formed, but the document version is outside
    // the readable range: the ladder refuses it (UnsupportedVersionError) and
    // the session quarantines rather than silently mis-reading it.
    const badVersion = JSON.stringify({
      v: 1,
      document: { ...init(), version: 99 },
      cleanHash: null,
    });

    const ctx = await boot(createMemoryStorage({ [SESSION_KEY]: badVersion }));

    expect(ctx.storage.map.get(QUARANTINE_KEY)).toBe(badVersion);
    expect(ctx.storage.map.has(SESSION_KEY)).toBe(false);
    expect(ctx.useTransportStore.getState().bpm).toBe(init().transport.bpm);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("quarantines a decodable session whose apply fails (unknown kit)", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const document = initDocument();
    document.kit.id = "kit-404";
    const envelope = sessionEnvelopeJson(
      document,
      hashPresetDocument(document),
    );

    const ctx = await boot(createMemoryStorage({ [SESSION_KEY]: envelope }));

    // apply threw before the first store write; quarantined and init applied.
    expect(ctx.storage.map.get(QUARANTINE_KEY)).toBe(envelope);
    expect(ctx.storage.map.has(SESSION_KEY)).toBe(false);
    expect(ctx.usePresetMetaStore.getState().currentKitMeta.id).toBe(
      loadKit(init().kit.id)!.meta.id,
    );
    expect(ctx.useTransportStore.getState().bpm).toBe(init().transport.bpm);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("bootstrapSession: one-time legacy adoption", () => {
  it("replays the five envelopes into the state the old rehydration produced", async () => {
    const seed = legacySeed();
    const ctx = await boot(createMemoryStorage(seed));

    // Transport: bpm verbatim; the pre-#269 swing knob 48 rescales to knob 64
    // and lands in canonical Tone-swing units (64 / 100 * 0.375 = 0.24).
    expect(ctx.useTransportStore.getState().bpm).toBe(128);
    expect(ctx.useTransportStore.getState().swing).toBeCloseTo(0.24, 6);

    // Instruments: the v1-era release knob (63) became the canonical decay
    // time in seconds through the frozen exponential curve.
    const instruments = ctx.useInstrumentsStore.getState().instruments;
    expect(instruments[0].params.decay).toBeCloseTo(1.9875155, 6);
    expect("release" in instruments[0].params).toBe(false);

    // Sequencer: pattern and chain restored, selection kept from the
    // envelope (2), not derived from the chain's first step (1).
    const patternState = ctx.usePatternStore.getState();
    expect(patternState.pattern.voices[0].variations[0].triggers[0]).toBe(true);
    expect(
      patternState.pattern.voices[0].variations[0].velocities[0],
    ).toBeCloseTo(0.75, 9);
    expect(patternState.chain.steps).toEqual([{ variation: 1, repeats: 2 }]);
    expect(patternState.chainEnabled).toBe(true);
    expect(patternState.variation).toBe(2);

    // Master: the knob values convert to canonical units - the split-filter
    // position (25) to a low-pass `{ side, cutoffHz }`, the reverb macro to a
    // 0..1 fraction (33 -> 0.33), and master volume to dB (88 -> -2).
    const master = ctx.useMasterChainStore.getState();
    expect(master.filter.side).toBe("lowpass");
    expect(master.filter.cutoffHz).toBeCloseTo(3904.6230737, 6);
    expect(master.reverb).toBeCloseTo(0.33, 6);
    expect(master.masterVolume).toBeCloseTo(-2, 6);

    // Meta: restored via the capture (the persist migrate narrowed the
    // envelope before bootstrap ran).
    const meta = ctx.usePresetMetaStore.getState();
    expect(meta.currentPresetMeta.id).toBe(init().meta.id);
    expect(meta.currentKitMeta.id).toBe("kit-0");

    // Session written; the four retired keys deleted; the selection seeded
    // into the session-UI key; the legacy preset-meta key is consumed by the
    // PR 6 library adoption (backed up verbatim, then retired).
    const envelopeRaw = ctx.storage.map.get(SESSION_KEY);
    expect(envelopeRaw).toBeDefined();
    const envelope = JSON.parse(envelopeRaw!) as {
      v: number;
      document: PresetDocument;
      cleanHash: string;
    };
    expect(envelope.v).toBe(1);
    expect(envelope.document.transport.bpm).toBe(128);
    expect(envelope.cleanHash).toBe(
      ctx.usePresetMetaStore.getState().cleanHash,
    );

    for (const key of MUSICAL_LEGACY_KEYS) {
      expect(ctx.storage.map.has(key)).toBe(false);
    }

    const sessionUi = JSON.parse(ctx.storage.map.get(SESSION_UI_KEY)!) as {
      state: { variation: number };
    };
    expect(sessionUi.state.variation).toBe(2);

    // The library adoption retired the legacy preset-meta key, preserving
    // its raw payload verbatim under the backup key (never destroyed).
    expect(ctx.storage.map.has(PRESET_META_KEY)).toBe(false);
    expect(ctx.storage.map.get(LIBRARY_BACKUP_KEY)).toBe(seed[PRESET_META_KEY]);

    // The adopted session reads clean.
    expect(ctx.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it("reboots from the adopted session identically (no double adoption)", async () => {
    const storage = createMemoryStorage(legacySeed());
    await boot(storage);
    const ctx = await boot(storage);

    expect(ctx.useTransportStore.getState().bpm).toBe(128);
    expect(ctx.usePatternStore.getState().variation).toBe(2);
    expect(ctx.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });

  it("on adopter failure applies init and preserves every legacy key", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const seed = legacySeed();
    // A corrupt pattern fails migratePatternUnsafe, and with it adoption.
    seed[SEQUENCER_KEY] = JSON.stringify({
      state: { pattern: 42, variation: 1 },
      version: 3,
    });

    const ctx = await boot(createMemoryStorage(seed));

    // Every musical legacy key is byte-identical; no session was written.
    for (const key of MUSICAL_LEGACY_KEYS) {
      expect(ctx.storage.map.get(key)).toBe(seed[key]);
    }
    expect(ctx.storage.map.has(SESSION_KEY)).toBe(false);

    // init applied.
    expect(ctx.useTransportStore.getState().bpm).toBe(init().transport.bpm);
    expect(ctx.usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      init().meta.id,
    );
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("bootstrapSession: first visit", () => {
  it("applies the default preset exactly like the old loadPresetFile(init()) boot", async () => {
    const ctx = await boot(createMemoryStorage());

    const initFile = init();
    expect(ctx.useTransportStore.getState().bpm).toBe(initFile.transport.bpm);
    expect(ctx.useTransportStore.getState().swing).toBeCloseTo(
      initFile.transport.swing,
      6,
    );
    expect(ctx.usePatternStore.getState().pattern).toEqual(
      initDocument().pattern,
    );
    expect(ctx.usePresetMetaStore.getState().currentPresetMeta.id).toBe(
      initFile.meta.id,
    );
    expect(ctx.usePresetMetaStore.getState().currentKitMeta.id).toBe(
      loadKit(initFile.kit.id)!.meta.id,
    );

    // Clean from the start, with a real baseline (not the null placeholder).
    expect(ctx.usePresetMetaStore.getState().cleanHash).not.toBeNull();
    expect(ctx.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);

    // Nothing quarantined, no session written yet (autosave owns that).
    expect(ctx.storage.map.has(SESSION_KEY)).toBe(false);
    expect(ctx.storage.map.has(QUARANTINE_KEY)).toBe(false);
  });
});

describe("dirty tracking across simulated reloads", () => {
  it("a dirty session reloads dirty, and markPresetClean settles it", async () => {
    // First visit, then an edit: dirty.
    const first = await boot(createMemoryStorage());
    first.useTransportStore.getState().setBpm(140);
    expect(first.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(true);

    // Autosave persists the CURRENT (edited) document alongside the CLEAN
    // baseline hash.
    autosaveNow(first);

    // Reload: still the edited state, still dirty.
    const second = await boot(first.storage);
    expect(second.useTransportStore.getState().bpm).toBe(140);
    expect(second.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(true);

    // Saving marks clean; another reload stays clean.
    second.usePresetMetaStore.getState().markPresetClean();
    expect(second.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(
      false,
    );
    autosaveNow(second);

    const third = await boot(second.storage);
    expect(third.useTransportStore.getState().bpm).toBe(140);
    expect(third.usePresetMetaStore.getState().hasUnsavedChanges()).toBe(false);
  });
});
