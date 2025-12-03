import { DEFAULT_VELOCITY, STEP_COUNT } from "@/core/audio/engine/constants";
import {
  InstrumentData,
  InstrumentParams,
} from "@/features/instrument/types/instrument";
import { KitFileV1 } from "@/features/kit/types/kit";
import { MasterChainParams } from "@/features/master-bus/types/master";
import {
  clampVariationId,
  DEFAULT_CHAIN,
  legacyCycleToChain,
  sanitizeChain,
} from "@/features/sequencer/lib/chain";
import type {
  Pattern,
  StepSequence,
  Voice,
} from "@/features/sequencer/types/pattern";
import {
  PatternChain,
  VARIATION_LABELS,
  VariationCycle,
  VariationId,
} from "@/features/sequencer/types/sequencer";
import { init } from "../../../../core/dh";
import { PresetFileV1 } from "../../types/preset";
import { compactCodeToKitId, kitIdToCompactCode } from "./defaultKits";

/**
 * Ultra-compact preset format with aggressive optimizations:
 * - Bit-packed triggers (16 bools → 4 hex chars)
 * - Quantized velocities (floats → ints 0-100)
 * - Single-letter keys
 * - Kit ID as single digit (0-9)
 * - Omit default values
 */

const PACKED_TRIGGER_HEX_LENGTH = Math.ceil(STEP_COUNT / 4);

const INIT_PRESET = init();
const DEFAULT_SWING = INIT_PRESET.transport.swing;
const DEFAULT_VARIATION_CYCLE = INIT_PRESET.sequencer.variationCycle;
const DEFAULT_PATTERN_CHAIN = sanitizeChain(
  INIT_PRESET.sequencer.chain ?? DEFAULT_CHAIN,
);
const DEFAULT_CHAIN_ENABLED = INIT_PRESET.sequencer.chainEnabled ?? false;
const DEFAULT_BPM = INIT_PRESET.transport.bpm;

const DEFAULT_PARAMS: InstrumentParams = init().kit.instruments[0].params;

const DEFAULT_MASTER_CHAIN: MasterChainParams = init().masterChain;

// --- BIT PACKING FOR TRIGGERS ---

/**
 * Pack 16 boolean triggers into a 4-character hex string
 * [true,false,false,false,true,false,false,false,...] → "9000"
 */
function packTriggers(triggers: boolean[]): string {
  if (STEP_COUNT !== 16) {
    throw new Error("Invalid bit packing params: STEP_COUNT must be 16");
  }

  let bits = 0;
  for (let i = 0; i < STEP_COUNT; i++) {
    if (triggers[i]) {
      bits |= 1 << i;
    }
  }
  return bits.toString(16).padStart(PACKED_TRIGGER_HEX_LENGTH, "0");
}

/**
 * Unpack 4-character hex string into 16 boolean triggers
 * "9000" → [true,false,false,false,true,false,false,false,...]
 */
function unpackTriggers(hex: string): boolean[] {
  if (STEP_COUNT !== 16) {
    throw new Error("Invalid bit packing params: STEP_COUNT must be 16");
  }

  const bits = parseInt(hex, 16);
  const triggers: boolean[] = [];
  for (let i = 0; i < STEP_COUNT; i++) {
    triggers.push((bits & (1 << i)) !== 0);
  }
  return triggers;
}

const EMPTY_TRIGGERS = Array(STEP_COUNT).fill(false);
const EMPTY_COMPACT_STEP: CompactStepSequence = {
  t: packTriggers(EMPTY_TRIGGERS),
};

function stringifyChain(chain: PatternChain): string {
  return sanitizeChain(chain)
    .steps.map(
      ({ variation, repeats }) => `${VARIATION_LABELS[variation]}${repeats}`,
    )
    .join("");
}

const DEFAULT_CHAIN_STRING = stringifyChain(DEFAULT_PATTERN_CHAIN);

function encodeChain(chain: PatternChain): string | undefined {
  const encoded = stringifyChain(chain);
  return encoded === DEFAULT_CHAIN_STRING ? undefined : encoded;
}

function decodeChainString(chainString?: string): PatternChain {
  if (!chainString) return DEFAULT_PATTERN_CHAIN;

  const steps: PatternChain["steps"] = [];

  for (let i = 0; i < chainString.length; i += 2) {
    const label = chainString[i];
    if (!label) continue;

    const repeatChar = chainString[i + 1] ?? "1";
    const variationIndex = VARIATION_LABELS.indexOf(
      label as (typeof VARIATION_LABELS)[number],
    );

    if (variationIndex < 0) continue;

    const repeats = Number.parseInt(repeatChar, 10);

    steps.push({
      variation: clampVariationId(variationIndex as VariationId),
      repeats: Number.isFinite(repeats) ? repeats : 1,
    });
  }

  return sanitizeChain({ steps });
}

// --- VELOCITY QUANTIZATION ---

/**
 * Quantize velocity from float (0.0-1.0) to int (0-100)
 * 0.5625965996908809 → 56
 */
function quantizeVelocity(velocity: number): number {
  return Math.round(velocity * 100);
}

/**
 * Dequantize velocity from int (0-100) to float (0.0-1.0)
 * 56 → 0.56
 */
function dequantizeVelocity(quantized: number): number {
  return quantized / 100;
}

// --- COMPACT ENCODING ---

/**
 * Compact step sequence format
 * - t: 4-char hex (bit-packed triggers)
 * - v: sparse velocities as ints 0-100
 * - n: timing nudge (omit if 0)
 * - r: ratchets (bit-packed, omit if none)
 * - f: flams (bit-packed, omit if none)
 */
type CompactStepSequence = {
  t: string; // hex-encoded bit-packed triggers
  v?: Record<string, number>; // sparse velocities (quantized to 0-100)
  n?: number; // timing nudge (-2 to +2, omit if 0)
  r?: string; // ratchets (bit-packed)
  f?: string; // flams (bit-packed)
};

/**
 * Compact voice format
 */
type CompactVoice = {
  i: number; // instrument index
  a: CompactStepSequence; // variation A
  b: CompactStepSequence; // variation B
  c?: CompactStepSequence; // variation C
  d?: CompactStepSequence; // variation D
};

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
export type CompactPreset = {
  id: string; // preset UUID (new UUID generated when sharing)
  k: string; // kit ID (single digit 0-9)
  n?: string; // preset name
  ip: CompactParams[]; // instrument params (8 items, only non-defaults)
  pt: CompactVoice[]; // pattern voices (8 items)
  ac?: [string?, string?, string?, string?]; // accent patterns (hex-encoded, omit if no accents) [A, B, C, D]
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

function encodeStepSequence(seq: StepSequence): CompactStepSequence {
  const compact: CompactStepSequence = {
    t: packTriggers(seq.triggers),
  };

  // Sparse velocities (only non-1.0, quantized)
  const velocities: Record<string, number> = {};
  seq.velocities.forEach((vel, idx) => {
    if (vel !== DEFAULT_VELOCITY) {
      velocities[idx] = quantizeVelocity(vel);
    }
  });

  if (Object.keys(velocities).length > 0) {
    compact.v = velocities;
  }

  // Timing nudge (only if non-zero)
  if (seq.timingNudge !== 0) {
    compact.n = seq.timingNudge;
  }

  // Ratchets/flams (only if any are enabled)
  if (seq.ratchets?.some((r) => r)) {
    compact.r = packTriggers(seq.ratchets);
  }

  if (seq.flams?.some((f) => f)) {
    compact.f = packTriggers(seq.flams);
  }

  return compact;
}

function isSequenceEmpty(seq: StepSequence): boolean {
  const hasTriggers = seq.triggers.some(Boolean);
  const hasVelocityChanges = seq.velocities.some(
    (vel) => vel !== DEFAULT_VELOCITY,
  );
  const hasRatchets = seq.ratchets?.some(Boolean);
  const hasFlams = seq.flams?.some(Boolean);

  return (
    !hasTriggers &&
    !hasVelocityChanges &&
    !hasRatchets &&
    !hasFlams &&
    (seq.timingNudge ?? 0) === 0
  );
}

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

export function encodeCompactPreset(preset: PresetFileV1): CompactPreset {
  const kitId = kitIdToCompactCode(preset.kit.meta.id);
  if (!kitId) {
    throw new Error(
      `Unknown kit ID: ${preset.kit.meta.id}. Only default kits can be shared.`,
    );
  }

  const compact: CompactPreset = {
    id: preset.meta.id, // Include the UUID (generated fresh when sharing)
    k: kitId,
    ip: preset.kit.instruments.map((inst: InstrumentData) =>
      encodeParams(inst.params),
    ),
    pt: preset.sequencer.pattern.voices.map((voice: Voice) => {
      const voicePayload: CompactVoice = {
        i: voice.instrumentIndex,
        a: encodeStepSequence(voice.variations[0]),
        b: encodeStepSequence(voice.variations[1]),
      };

      if (!isSequenceEmpty(voice.variations[2])) {
        voicePayload.c = encodeStepSequence(voice.variations[2]);
      }

      if (!isSequenceEmpty(voice.variations[3])) {
        voicePayload.d = encodeStepSequence(voice.variations[3]);
      }

      return voicePayload;
    }),
  };

  // Encode accent patterns (only if any accents exist)
  const accentA = preset.sequencer.pattern.variationMetadata[0].accent;
  const accentB = preset.sequencer.pattern.variationMetadata[1].accent;
  const accentC = preset.sequencer.pattern.variationMetadata[2].accent;
  const accentD = preset.sequencer.pattern.variationMetadata[3].accent;
  const hasAccentsA = accentA.some((a) => a);
  const hasAccentsB = accentB.some((a) => a);
  const hasAccentsC = accentC.some((a) => a);
  const hasAccentsD = accentD.some((a) => a);

  if (hasAccentsA || hasAccentsB || hasAccentsC || hasAccentsD) {
    compact.ac = [
      hasAccentsA ? packTriggers(accentA) : undefined,
      hasAccentsB ? packTriggers(accentB) : undefined,
      hasAccentsC ? packTriggers(accentC) : undefined,
      hasAccentsD ? packTriggers(accentD) : undefined,
    ];
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

function decodeStepSequence(compact: CompactStepSequence): StepSequence {
  const triggers = unpackTriggers(compact.t);
  const velocities = Array(STEP_COUNT).fill(DEFAULT_VELOCITY);

  if (compact.v) {
    Object.entries(compact.v).forEach(([idx, quantized]) => {
      const stepIndex = Number(idx);
      velocities[stepIndex] = dequantizeVelocity(quantized);
    });
  }

  const ratchets = compact.r
    ? unpackTriggers(compact.r)
    : Array(STEP_COUNT).fill(false);
  const flams = compact.f
    ? unpackTriggers(compact.f)
    : Array(STEP_COUNT).fill(false);

  return {
    triggers,
    velocities,
    timingNudge: (compact.n ?? 0) as -2 | -1 | 0 | 1 | 2,
    ratchets,
    flams,
  };
}

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

export function decodeCompactPreset(
  compact: CompactPreset,
  kitLoader: (kitId: string) => KitFileV1,
): PresetFileV1 {
  const kitId = compactCodeToKitId(compact.k);
  if (!kitId) {
    throw new Error(`Unknown kit code: ${compact.k}`);
  }

  const defaultKit = kitLoader(kitId);

  const emptySequence = decodeStepSequence(EMPTY_COMPACT_STEP);

  const pattern: Pattern = {
    voices: compact.pt.map((voice) => ({
      instrumentIndex: voice.i,
      variations: [
        decodeStepSequence(voice.a),
        decodeStepSequence(voice.b),
        voice.c ? decodeStepSequence(voice.c) : emptySequence,
        voice.d ? decodeStepSequence(voice.d) : emptySequence,
      ],
    })),
    // Decode accent patterns (default to no accents if not present)
    variationMetadata: [
      {
        accent: compact.ac?.[0]
          ? unpackTriggers(compact.ac[0])
          : Array(STEP_COUNT).fill(false),
      },
      {
        accent: compact.ac?.[1]
          ? unpackTriggers(compact.ac[1])
          : Array(STEP_COUNT).fill(false),
      },
      {
        accent: compact.ac?.[2]
          ? unpackTriggers(compact.ac[2])
          : Array(STEP_COUNT).fill(false),
      },
      {
        accent: compact.ac?.[3]
          ? unpackTriggers(compact.ac[3])
          : Array(STEP_COUNT).fill(false),
      },
    ],
  };

  const instruments = defaultKit.instruments.map((inst, idx: number) => ({
    ...inst,
    params: decodeParams(compact.ip[idx]),
  }));

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
    version: 1,
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
