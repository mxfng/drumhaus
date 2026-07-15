import {
  Pattern,
  PatternChain,
  sanitizeChain,
} from "@/core/audio/engine/pattern-types";
import type { KitFile } from "@/features/kit/types/kit";
import type {
  LegacyKnobInstrumentData,
  LegacyKnobInstrumentParams,
  LegacyKnobMasterChainParams,
} from "@/features/preset/types/legacy-v1";
import { legacyCycleToChain } from "@/features/sequencer/lib/chain";
import { VariationCycle } from "@/features/sequencer/types/sequencer";
import { PRESET_FILE_VERSION } from "../../document/migrate";
import { PresetFileV1 } from "../../types/preset";
import { compactCodeToKitId, kitIdToCompactCode } from "./default-kits";
import {
  CompactAccents,
  CompactVoice,
  decodeAccents,
  decodeVoices,
  encodeAccents,
  encodeVoices,
  parseChainString,
  stringifyChain,
} from "./pattern-codec";

/**
 * The v1.5 compact share format: knob-space (0-100) values with single-letter
 * keys, bit-packed pattern data, sparse non-default values, and a positional
 * kit code (index into KIT_ORDER).
 *
 * Versioning: the codec was originally unversioned; the `v` field was
 * introduced with the #269 swing retune, mirroring the .dh file version
 * (PRESET_FILE_VERSION = 1.5). Versionless (pre-#269) payloads are no longer
 * decoded at all: urlToDocument refuses them with UnsupportedVersionError
 * (docs/preset-persistence.md, decision 4), so this module only ever sees
 * `v: 1.5` payloads. New links are written by the v2 document codec
 * (compact-v2.ts); this decoder stays alive alongside the v1.x file readers
 * until the v1.x sunset.
 */

// Legacy-read island: the delta-defaults are FROZEN at the v1.5 init preset's
// knob values, not derived from the live init() (which is canonical now). Old
// links omit any field that equalled these defaults, so they must never drift.
const DEFAULT_SWING = 0;
const DEFAULT_VARIATION_CYCLE: VariationCycle | undefined = undefined;
const DEFAULT_PATTERN_CHAIN = sanitizeChain({
  steps: [{ variation: 0, repeats: 1 }],
});
const DEFAULT_CHAIN_ENABLED = false;
const DEFAULT_BPM = 100;

const DEFAULT_PARAMS: LegacyKnobInstrumentParams = {
  decay: 100,
  filter: 50,
  volume: 92,
  pan: 50,
  tune: 50,
  solo: false,
  mute: false,
};

const DEFAULT_MASTER_CHAIN: LegacyKnobMasterChainParams = {
  filter: 50,
  saturation: 0,
  phaser: 0,
  reverb: 0,
  compThreshold: 100,
  compRatio: 57.14285714285714,
  compAttack: 50,
  compMix: 70,
  masterVolume: 92,
};

const DEFAULT_CHAIN_STRING = stringifyChain(DEFAULT_PATTERN_CHAIN);

function encodeChain(chain: PatternChain): string | undefined {
  const encoded = stringifyChain(chain);
  return encoded === DEFAULT_CHAIN_STRING ? undefined : encoded;
}

function decodeChainString(chainString?: string): PatternChain {
  if (!chainString) return DEFAULT_PATTERN_CHAIN;
  return parseChainString(chainString);
}

// --- COMPACT ENCODING ---

/**
 * Compact instrument params (only non-default values)
 */
type CompactParams = {
  d?: number; // decay
  f?: number; // filter
  v?: number; // volume
  p?: number; // pan
  t?: number; // tune
  s?: number; // solo (1/0)
  m?: number; // mute (1/0)
};

/**
 * Compact preset format
 */
type CompactPreset = {
  id: string; // preset UUID (new UUID generated when sharing)
  v?: number; // codec version, mirrors PRESET_FILE_VERSION (absent = refused pre-#269 legacy URL)
  k: string; // kit code (positional index into KIT_ORDER)
  n?: string; // preset name
  ip: CompactParams[]; // instrument params (8 items, only non-defaults)
  pt: CompactVoice[]; // pattern voices (8 items)
  ac?: CompactAccents; // accent patterns (hex-encoded, omit if no accents) [A, B, C, D]
  vc?: string; // legacy variation cycle (omit if undefined)
  ch?: string; // chain string (variation + repeat pairs)
  ce?: number; // chain enabled flag
  bpm?: number; // bpm (omit if 120)
  sw?: number; // swing (omit if 0)
  mc?: CompactMasterChain;
};

type CompactMasterChain = Partial<{
  // New format
  f: number; // filter (unified split filter)
  s: number; // saturation
  ph: number; // phaser
  rv: number; // reverb
  ct: number; // compThreshold
  cr: number; // compRatio
  ca: number; // compAttack
  cm: number; // compMix
  mv: number; // masterVolume

  // Legacy format (for backward compatibility during decode)
  lp?: number; // lowPass (legacy)
  hp?: number; // highPass (legacy)
}>;

// --- ENCODE FUNCTIONS ---

function encodeParams(params: InstrumentParams): CompactParams {
  const compact: CompactParams = {};

  if (params.decay !== DEFAULT_PARAMS.decay) compact.d = params.decay;
  if (params.filter !== DEFAULT_PARAMS.filter) compact.f = params.filter;
  if (params.volume !== DEFAULT_PARAMS.volume) compact.v = params.volume;
  if (params.pan !== DEFAULT_PARAMS.pan) compact.p = params.pan;
  if (params.tune !== DEFAULT_PARAMS.tune) compact.t = params.tune;
  if (params.solo !== DEFAULT_PARAMS.solo) compact.s = params.solo ? 1 : 0;
  if (params.mute !== DEFAULT_PARAMS.mute) compact.m = params.mute ? 1 : 0;

  return compact;
}

function encodeMasterChain(
  chain: MasterChainParams,
): CompactMasterChain | undefined {
  const mc: CompactMasterChain = {};
  if (chain.filter !== DEFAULT_MASTER_CHAIN.filter) mc.f = chain.filter;
  if (chain.saturation !== DEFAULT_MASTER_CHAIN.saturation)
    mc.s = chain.saturation;
  if (chain.phaser !== DEFAULT_MASTER_CHAIN.phaser) mc.ph = chain.phaser;
  if (chain.reverb !== DEFAULT_MASTER_CHAIN.reverb) mc.rv = chain.reverb;
  if (chain.compThreshold !== DEFAULT_MASTER_CHAIN.compThreshold)
    mc.ct = chain.compThreshold;
  if (chain.compRatio !== DEFAULT_MASTER_CHAIN.compRatio)
    mc.cr = chain.compRatio;
  if (chain.compAttack !== DEFAULT_MASTER_CHAIN.compAttack)
    mc.ca = chain.compAttack;
  if (chain.compMix !== DEFAULT_MASTER_CHAIN.compMix) mc.cm = chain.compMix;
  if (chain.masterVolume !== DEFAULT_MASTER_CHAIN.masterVolume)
    mc.mv = chain.masterVolume;

  return Object.keys(mc).length > 0 ? mc : undefined;
}

function encodeCompactPreset(preset: PresetFileV1): CompactPreset {
  const kitId = kitIdToCompactCode(preset.kit.meta.id);
  if (!kitId) {
    throw new Error(
      `Unknown kit ID: ${preset.kit.meta.id}. Only default kits can be shared.`,
    );
  }

  const compact: CompactPreset = {
    id: preset.meta.id, // Include the UUID (generated fresh when sharing)
    v: PRESET_FILE_VERSION,
    k: kitId,
    ip: preset.kit.instruments.map((inst: InstrumentData) =>
      encodeParams(inst.params),
    ),
    pt: encodeVoices(preset.sequencer.pattern),
  };

  // Encode accent patterns (only if any accents exist)
  const accents = encodeAccents(preset.sequencer.pattern.variationMetadata);
  if (accents) {
    compact.ac = accents;
  }

  // Always include preset name
  compact.n = preset.meta.name;

  if (
    preset.sequencer.variationCycle &&
    preset.sequencer.variationCycle !== DEFAULT_VARIATION_CYCLE
  ) {
    compact.vc = preset.sequencer.variationCycle;
  }

  const encodedChain = encodeChain(
    preset.sequencer.chain ?? DEFAULT_PATTERN_CHAIN,
  );

  if (encodedChain) {
    compact.ch = encodedChain;
  }

  if (preset.sequencer.chainEnabled !== DEFAULT_CHAIN_ENABLED) {
    compact.ce = preset.sequencer.chainEnabled ? 1 : 0;
  }

  if (preset.transport.bpm !== DEFAULT_BPM) {
    compact.bpm = preset.transport.bpm;
  }

  if (preset.transport.swing !== DEFAULT_SWING) {
    compact.sw = preset.transport.swing;
  }

  const masterChain = encodeMasterChain(preset.masterChain);
  if (masterChain) {
    compact.mc = masterChain;
  }

  return compact;
}

// --- DECODE FUNCTIONS ---

function decodeParams(compact: CompactParams): InstrumentParams {
  return {
    decay: compact.d ?? DEFAULT_PARAMS.decay,
    filter: compact.f ?? DEFAULT_PARAMS.filter,
    volume: compact.v ?? DEFAULT_PARAMS.volume,
    pan: compact.p ?? DEFAULT_PARAMS.pan,
    tune: compact.t ?? DEFAULT_PARAMS.tune,
    solo: compact.s === 1,
    mute: compact.m === 1,
  };
}

function decodeMasterChain(compact?: CompactMasterChain): MasterChainParams {
  // Handle legacy format (lp/hp) or new format (f/s/ca)
  if (compact?.f !== undefined) {
    // New format
    return {
      filter: compact.f,
      saturation: compact.s ?? DEFAULT_MASTER_CHAIN.saturation,
      phaser: compact.ph ?? DEFAULT_MASTER_CHAIN.phaser,
      reverb: compact.rv ?? DEFAULT_MASTER_CHAIN.reverb,
      compThreshold: compact.ct ?? DEFAULT_MASTER_CHAIN.compThreshold,
      compRatio: compact.cr ?? DEFAULT_MASTER_CHAIN.compRatio,
      compAttack: compact.ca ?? DEFAULT_MASTER_CHAIN.compAttack,
      compMix: compact.cm ?? DEFAULT_MASTER_CHAIN.compMix,
      masterVolume: compact.mv ?? DEFAULT_MASTER_CHAIN.masterVolume,
    };
  }

  // Legacy format: convert lp/hp to unified filter
  // This will be further processed by migrateMasterChainParams
  return {
    filter: DEFAULT_MASTER_CHAIN.filter,
    saturation: DEFAULT_MASTER_CHAIN.saturation,
    phaser: compact?.ph ?? DEFAULT_MASTER_CHAIN.phaser,
    reverb: compact?.rv ?? DEFAULT_MASTER_CHAIN.reverb,
    compThreshold: compact?.ct ?? DEFAULT_MASTER_CHAIN.compThreshold,
    compRatio: compact?.cr ?? DEFAULT_MASTER_CHAIN.compRatio,
    compAttack: compact?.ca ?? DEFAULT_MASTER_CHAIN.compAttack,
    compMix: compact?.cm ?? DEFAULT_MASTER_CHAIN.compMix,
    masterVolume: compact?.mv ?? DEFAULT_MASTER_CHAIN.masterVolume,
    // Include legacy values for migration
    lowPass: compact?.lp,
    highPass: compact?.hp,
  };
}

function decodeCompactPreset(
  compact: CompactPreset,
  kitLoader: (kitId: string) => KitFile,
): PresetFileV1 {
  const kitId = compactCodeToKitId(compact.k);
  if (!kitId) {
    throw new Error(`Unknown kit code: ${compact.k}`);
  }

  const defaultKit = kitLoader(kitId);

  const pattern: Pattern = {
    voices: decodeVoices(compact.pt),
    // Decode accent patterns (default to no accents if not present)
    variationMetadata: decodeAccents(compact.ac),
  };

  // The registry kit is canonical; the v1.5 decoder keeps its sample/meta
  // identity and overrides with the decoded knob params (legacy shape).
  const instruments: LegacyKnobInstrumentData[] = defaultKit.instruments.map(
    (inst, idx: number) => ({
      meta: inst.meta,
      role: inst.role,
      sample: inst.sample,
      params: decodeParams(compact.ip[idx]),
    }),
  );

  const legacyChain = legacyCycleToChain(
    (compact.vc ?? DEFAULT_VARIATION_CYCLE) as VariationCycle | undefined,
    0,
  );

  const chain = compact.ch
    ? decodeChainString(compact.ch)
    : (legacyChain.chain ?? DEFAULT_PATTERN_CHAIN);

  const chainEnabled =
    compact.ce !== undefined
      ? compact.ce === 1
      : (legacyChain.chainEnabled ?? DEFAULT_CHAIN_ENABLED);

  return {
    kind: "drumhaus.preset",
    // Decoded presets are normalized to the current knob-space file
    // version: only v: 1.5 payloads reach this decoder (versionless legacy
    // URLs are refused upstream, decision 4), so no swing migration applies.
    version: PRESET_FILE_VERSION,
    meta: {
      id: compact.id, // Use the UUID from the encoded preset
      name: compact.n || "Shared Preset",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    kit: {
      kind: "drumhaus.kit",
      version: 1,
      meta: defaultKit.meta,
      instruments,
    },
    transport: {
      bpm: compact.bpm ?? DEFAULT_BPM,
      swing: compact.sw ?? DEFAULT_SWING,
    },
    sequencer: {
      pattern,
      variationCycle: (compact.vc ?? DEFAULT_VARIATION_CYCLE) as
        | VariationCycle
        | undefined,
      chain,
      chainEnabled,
    },
    masterChain: decodeMasterChain(compact.mc),
  };
}

export { encodeCompactPreset, decodeCompactPreset };
export type { CompactPreset };
