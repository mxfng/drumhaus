/**
 * The one-time legacy session adopter (docs/preset-persistence.md, PR 5):
 * assembles a preset file from the five retired per-store zustand persist
 * envelopes, replaying each store's persist migration, so the first boot
 * after this release converts the old smeared session into one session
 * document.
 *
 * The replay helpers are the new home of the retired inline persist
 * `migrate` functions (the stores no longer persist, so the logic cannot
 * live there):
 *
 * - instruments v1 -> v2: the release->decay / pitch->tune rename
 *   (formerly use-instruments-store.ts).
 * - sequencer: migratePatternUnsafe plus the legacy variationCycle -> chain
 *   conversion (formerly use-pattern-store.ts). Unlike the old migrate,
 *   a corrupt pattern THROWS here instead of degrading to an empty pattern:
 *   adoption fails as a whole and every legacy key is preserved.
 * - transport v0 -> v1: the #269 swing-retune rescale (knob * 4/3, clamped),
 *   formerly use-transport-store.ts; semantics pinned in
 *   legacy-adopter.test.ts.
 * - master chain (unversioned): persisted fields over the store defaults,
 *   mirroring zustand's shallow merge.
 * - preset-meta: currentPresetMeta/currentKitMeta arrive via
 *   legacy-preset-meta-capture.ts (the library adoption consumes and
 *   deletes the envelope before this module runs).
 *
 * The assembled file is version 1.5 (current knob space - the swing replay
 * already happened), so the standard validate -> migrate -> apply pipeline
 * absorbs the remaining field-presence legacy exactly as it does for files.
 */

import {
  clampVariationId,
  DEFAULT_CHAIN,
  sanitizeChain,
  type Pattern,
  type PatternChain,
  type VariationId,
} from "@/core/audio/engine/pattern-types";
import { init } from "@/core/dh";
import { loadKit } from "@/core/dhkit";
import { PRESET_FILE_VERSION } from "@/features/preset/document";
import type {
  LegacyKnobInstrumentData,
  LegacyKnobInstrumentParams,
  LegacyKnobMasterChainParams,
} from "@/features/preset/types/legacy-v1";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { legacyCycleToChain } from "@/features/sequencer/lib/chain";
import { createEmptyPattern } from "@/features/sequencer/lib/helpers";
import { migratePatternUnsafe } from "@/features/sequencer/lib/migrations";
import type { VariationCycle } from "@/features/sequencer/types/sequencer";
import { migrateLegacySwingKnob } from "@/features/transport/lib/legacy-swing";
import { getCapturedLegacyPresetMeta } from "./legacy-preset-meta-capture";

const LEGACY_INSTRUMENTS_STORAGE_KEY = "drumhaus-instruments-storage";
const LEGACY_SEQUENCER_STORAGE_KEY = "drumhaus-sequencer-storage";
const LEGACY_TRANSPORT_STORAGE_KEY = "drumhaus-transport-storage";
const LEGACY_MASTER_CHAIN_STORAGE_KEY = "drumhaus-master-chain-storage";
/**
 * Consumed and deleted by the library adoption
 * (features/preset/library/adoption.ts), which runs before the session
 * ladder and stashes the meta fields this adopter needs in
 * legacy-preset-meta-capture.ts.
 */
const LEGACY_PRESET_META_STORAGE_KEY = "drumhaus-preset-meta-storage";

/** The four keys the adopter deletes after a successful session write. */
const RETIRED_LEGACY_STORAGE_KEYS = [
  LEGACY_INSTRUMENTS_STORAGE_KEY,
  LEGACY_SEQUENCER_STORAGE_KEY,
  LEGACY_TRANSPORT_STORAGE_KEY,
  LEGACY_MASTER_CHAIN_STORAGE_KEY,
] as const;

/** The zustand persist envelope shape: `{ state, version }`. */
interface LegacyPersistEnvelope {
  state: unknown;
  version: number;
}

/**
 * Read one legacy persist envelope. Returns undefined when the key is
 * absent (or storage is denied); throws on an unparseable envelope, which
 * fails adoption as a whole and preserves every legacy key.
 */
function readLegacyPersistEnvelope(
  key: string,
): LegacyPersistEnvelope | undefined {
  let raw: string | null;
  try {
    raw = globalThis.localStorage.getItem(key);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;

  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null) {
    throw new Error(`Legacy envelope "${key}" is not an object`);
  }
  const envelope = data as { state?: unknown; version?: unknown };
  return {
    state: envelope.state,
    // zustand persists version 0 when none was configured.
    version: typeof envelope.version === "number" ? envelope.version : 0,
  };
}

/**
 * True when any of the five legacy persist keys is present. The preset-meta
 * key is usually gone by the time this runs (the library adoption consumes
 * it earlier in the same boot), so its presence is read from the capture it
 * leaves behind.
 */
function hasLegacySessionData(): boolean {
  if (getCapturedLegacyPresetMeta() !== null) return true;
  try {
    return [
      ...RETIRED_LEGACY_STORAGE_KEYS,
      LEGACY_PRESET_META_STORAGE_KEY,
    ].some((key) => globalThis.localStorage.getItem(key) !== null);
  } catch {
    return false;
  }
}

/** Delete the four retired keys; only call after the session write landed. */
function deleteRetiredLegacyStorageKeys(): void {
  try {
    for (const key of RETIRED_LEGACY_STORAGE_KEYS) {
      globalThis.localStorage.removeItem(key);
    }
  } catch {
    // Leaving stale keys behind is harmless: the session key now exists, so
    // the adopter never runs again.
  }
}

// Legacy-read island: the kit-0 default knob params, frozen from the v1.5
// registry. Used only when a partial legacy session has no instruments key;
// the assembled file is knob-space and migrateV1ToDocument converts it.
const KIT_0_DEFAULT_KNOB_PARAMS: LegacyKnobInstrumentParams[] = [
  {
    decay: 100,
    filter: 50,
    volume: 92,
    pan: 50,
    tune: 50,
    solo: false,
    mute: false,
  },
  {
    decay: 36,
    filter: 50,
    volume: 88,
    pan: 50,
    tune: 36,
    solo: false,
    mute: false,
  },
  {
    decay: 100,
    filter: 55,
    volume: 87,
    pan: 50,
    tune: 50,
    solo: false,
    mute: false,
  },
  {
    decay: 100,
    filter: 50,
    volume: 92,
    pan: 50,
    tune: 50,
    solo: false,
    mute: false,
  },
  {
    decay: 100,
    filter: 50,
    volume: 89,
    pan: 50,
    tune: 50,
    solo: false,
    mute: false,
  },
  {
    decay: 100,
    filter: 50,
    volume: 80,
    pan: 50,
    tune: 50,
    solo: false,
    mute: false,
  },
  {
    decay: 100,
    filter: 50,
    volume: 84,
    pan: 50,
    tune: 50,
    solo: false,
    mute: false,
  },
  {
    decay: 100,
    filter: 50,
    volume: 85,
    pan: 50,
    tune: 50,
    solo: false,
    mute: false,
  },
];

/** The kit-0 default kit in the knob-space legacy shape. */
function defaultKnobInstruments(): LegacyKnobInstrumentData[] {
  return loadKit("kit-0")!.instruments.map((inst, index) => ({
    meta: inst.meta,
    role: inst.role,
    sample: inst.sample,
    params: KIT_0_DEFAULT_KNOB_PARAMS[index],
  }));
}

/**
 * Replay of the instruments store's retired v1 -> v2 persist migration:
 * rename release -> decay and pitch -> tune, drop attack.
 */
function replayInstrumentsEnvelope(
  envelope: LegacyPersistEnvelope,
): LegacyKnobInstrumentData[] {
  const state = envelope.state as { instruments?: unknown } | undefined;
  if (!Array.isArray(state?.instruments)) {
    throw new Error("Legacy instruments envelope has no instruments array");
  }
  const instruments = state.instruments as LegacyKnobInstrumentData[];
  if (envelope.version !== 1) return instruments;

  return instruments.map((inst) => {
    const oldParams = inst.params as unknown as Record<string, unknown>;
    const { attack: _attack, release, pitch, ...rest } = oldParams;
    return {
      ...inst,
      params: {
        ...rest,
        decay: release ?? oldParams.decay,
        tune: pitch ?? oldParams.tune,
      } as LegacyKnobInstrumentParams,
    };
  });
}

interface AdoptedSequencerState {
  pattern: Pattern;
  variation: VariationId;
  chain: PatternChain;
  chainEnabled: boolean;
}

/**
 * Replay of the sequencer store's retired persist migration: pattern
 * normalization plus the legacy variationCycle -> chain conversion. Throws
 * on a corrupt pattern (see the module comment).
 */
function replaySequencerEnvelope(
  envelope: LegacyPersistEnvelope,
): AdoptedSequencerState {
  const state = (envelope.state ?? {}) as Partial<{
    pattern: unknown;
    variation: number;
    chain: PatternChain;
    chainEnabled: boolean;
    variationCycle: VariationCycle;
  }>;

  const pattern = migratePatternUnsafe(state.pattern ?? createEmptyPattern());
  const legacy = legacyCycleToChain(state.variationCycle, state.variation ?? 0);

  return {
    pattern,
    variation: clampVariationId(state.variation ?? legacy.variation),
    chain: sanitizeChain(state.chain ?? legacy.chain),
    chainEnabled: state.chainEnabled ?? legacy.chainEnabled,
  };
}

/**
 * Replay of the transport store's retired v0 -> v1 persist migration
 * (#269 swing retune): pre-retune swing knob values rescale by 4/3, clamped
 * to knob 100, so the persisted feel survives. Missing fields take the old
 * store initializer defaults, mirroring zustand's shallow merge.
 */
function replayTransportEnvelope(envelope: LegacyPersistEnvelope): {
  bpm: number;
  swing: number;
} {
  const state = envelope.state as
    | Partial<{ bpm: unknown; swing: unknown }>
    | undefined;
  const bpm = typeof state?.bpm === "number" ? state.bpm : 100;
  const swing = typeof state?.swing === "number" ? state.swing : 0;
  return {
    bpm,
    swing: envelope.version < 1 ? migrateLegacySwingKnob(swing) : swing,
  };
}

/**
 * The master-chain store never versioned or migrated its persist; persisted
 * fields land over the store initializer defaults, mirroring zustand's
 * shallow merge.
 */
function replayMasterChainEnvelope(
  envelope: LegacyPersistEnvelope,
): LegacyKnobMasterChainParams {
  const state = (envelope.state ?? {}) as Partial<LegacyKnobMasterChainParams>;
  // Frozen v1.5 master-chain knob defaults (the old store initializer values).
  return {
    filter: state.filter ?? 50,
    saturation: state.saturation ?? 0,
    phaser: state.phaser ?? 0,
    reverb: state.reverb ?? 0,
    compThreshold: state.compThreshold ?? 100,
    compRatio: state.compRatio ?? 50,
    compAttack: state.compAttack ?? 50,
    compMix: state.compMix ?? 70,
    masterVolume: state.masterVolume ?? 92,
  };
}

interface AssembledLegacySession {
  file: PresetFileV1;
  /**
   * The legacy sequencer envelope's selected pad, which is session-UI state
   * (decision 7) and seeds the drumhaus-session-ui key rather than the
   * document.
   */
  variation: VariationId;
}

/**
 * Assemble a v1.5 preset file from whatever legacy envelopes exist. A store
 * whose key is missing contributes the same defaults its create()
 * initializer held, exactly what the old boot's rehydration-or-defaults
 * produced. Throws on any corrupt envelope.
 */
function assembleLegacySession(): AssembledLegacySession {
  const instrumentsEnvelope = readLegacyPersistEnvelope(
    LEGACY_INSTRUMENTS_STORAGE_KEY,
  );
  const sequencerEnvelope = readLegacyPersistEnvelope(
    LEGACY_SEQUENCER_STORAGE_KEY,
  );
  const transportEnvelope = readLegacyPersistEnvelope(
    LEGACY_TRANSPORT_STORAGE_KEY,
  );
  const masterChainEnvelope = readLegacyPersistEnvelope(
    LEGACY_MASTER_CHAIN_STORAGE_KEY,
  );
  const capturedMeta = getCapturedLegacyPresetMeta();

  const instruments = instrumentsEnvelope
    ? replayInstrumentsEnvelope(instrumentsEnvelope)
    : defaultKnobInstruments();

  const sequencer: AdoptedSequencerState = sequencerEnvelope
    ? replaySequencerEnvelope(sequencerEnvelope)
    : {
        pattern: createEmptyPattern(),
        variation: 0,
        chain: DEFAULT_CHAIN,
        chainEnabled: false,
      };

  const transport = transportEnvelope
    ? replayTransportEnvelope(transportEnvelope)
    : { bpm: 100, swing: 0 };

  const masterChain = masterChainEnvelope
    ? replayMasterChainEnvelope(masterChainEnvelope)
    : replayMasterChainEnvelope({ state: {}, version: 0 });

  const fallback = init();

  const file: PresetFileV1 = {
    kind: "drumhaus.preset",
    // The swing replay already rescaled to current knob space, so the file
    // must claim v1.5 or validatePresetFileV1 would rescale a second time.
    version: PRESET_FILE_VERSION,
    meta: capturedMeta?.currentPresetMeta ?? fallback.meta,
    kit: {
      kind: "drumhaus.kit",
      version: 1,
      meta: capturedMeta?.currentKitMeta ?? loadKit(fallback.kit.id)!.meta,
      instruments,
    },
    transport,
    sequencer: {
      pattern: sequencer.pattern,
      chain: sequencer.chain,
      chainEnabled: sequencer.chainEnabled,
    },
    masterChain,
  };

  return { file, variation: sequencer.variation };
}

export {
  assembleLegacySession,
  deleteRetiredLegacyStorageKeys,
  hasLegacySessionData,
  LEGACY_INSTRUMENTS_STORAGE_KEY,
  LEGACY_MASTER_CHAIN_STORAGE_KEY,
  LEGACY_PRESET_META_STORAGE_KEY,
  LEGACY_SEQUENCER_STORAGE_KEY,
  LEGACY_TRANSPORT_STORAGE_KEY,
  replayInstrumentsEnvelope,
  replayMasterChainEnvelope,
  replaySequencerEnvelope,
  replayTransportEnvelope,
  RETIRED_LEGACY_STORAGE_KEYS,
};
export type { AssembledLegacySession, LegacyPersistEnvelope };
