import { DEFAULT_VELOCITY, STEP_COUNT } from "@/core/audio/engine/constants";
import {
  InstrumentData,
  InstrumentParams,
} from "@/features/instrument/types/instrument";
import { KitFileV1 } from "@/features/kit/types/kit";
import { MasterChainParams } from "@/features/master-bus/types/master";
import type {
  Pattern,
  StepSequence,
  Voice,
} from "@/features/sequencer/types/pattern";
import { VariationCycle } from "@/features/sequencer/types/sequencer";
import { init } from "..";
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

const DEFAULT_SWING = init().transport.swing;
const DEFAULT_VARIATION_CYCLE = init().sequencer.variationCycle;
const DEFAULT_BPM = init().transport.bpm;

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
 */
type CompactStepSequence = {
  t: string; // hex-encoded bit-packed triggers
  v?: Record<string, number>; // sparse velocities (quantized to 0-100)
};

/**
 * Compact voice format
 */
type CompactVoice = {
  i: number; // instrument index
  a: CompactStepSequence; // variation A
  b: CompactStepSequence; // variation B
};

/**
 * Compact instrument params (only non-default values)
 */
type CompactParams = {
  a?: number; // attack
  r?: number; // release
  f?: number; // filter
  v?: number; // volume
  p?: number; // pan
  t?: number; // pitch (using 't' to avoid conflict with 'p')
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
  vc?: string; // variation cycle (omit if "AB")
  bpm?: number; // bpm (omit if 120)
  sw?: number; // swing (omit if 0)
  mc?: CompactMasterChain;
};

type CompactMasterChain = Partial<{
  lp: number; // lowPass
  hp: number; // highPass
  ph: number; // phaser
  rv: number; // reverb
  ct: number; // compThreshold
  cr: number; // compRatio
  cm: number; // compMix
  mv: number; // masterVolume
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

  return compact;
}

function encodeParams(params: InstrumentParams): CompactParams {
  const compact: CompactParams = {};

  if (params.attack !== DEFAULT_PARAMS.attack) compact.a = params.attack;
  if (params.release !== DEFAULT_PARAMS.release) compact.r = params.release;
  if (params.filter !== DEFAULT_PARAMS.filter) compact.f = params.filter;
  if (params.volume !== DEFAULT_PARAMS.volume) compact.v = params.volume;
  if (params.pan !== DEFAULT_PARAMS.pan) compact.p = params.pan;
  if (params.pitch !== DEFAULT_PARAMS.pitch) compact.t = params.pitch;
  if (params.solo !== DEFAULT_PARAMS.solo) compact.s = params.solo ? 1 : 0;
  if (params.mute !== DEFAULT_PARAMS.mute) compact.m = params.mute ? 1 : 0;

  return compact;
}

function encodeMasterChain(
  chain: MasterChainParams,
): CompactMasterChain | undefined {
  const mc: CompactMasterChain = {};
  if (chain.lowPass !== DEFAULT_MASTER_CHAIN.lowPass) mc.lp = chain.lowPass;
  if (chain.highPass !== DEFAULT_MASTER_CHAIN.highPass) mc.hp = chain.highPass;
  if (chain.phaser !== DEFAULT_MASTER_CHAIN.phaser) mc.ph = chain.phaser;
  if (chain.reverb !== DEFAULT_MASTER_CHAIN.reverb) mc.rv = chain.reverb;
  if (chain.compThreshold !== DEFAULT_MASTER_CHAIN.compThreshold)
    mc.ct = chain.compThreshold;
  if (chain.compRatio !== DEFAULT_MASTER_CHAIN.compRatio)
    mc.cr = chain.compRatio;
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
    pt: preset.sequencer.pattern.map((voice: Voice) => ({
      i: voice.instrumentIndex,
      a: encodeStepSequence(voice.variations[0]),
      b: encodeStepSequence(voice.variations[1]),
    })),
  };

  // Always include preset name
  compact.n = preset.meta.name;

  if (preset.sequencer.variationCycle !== DEFAULT_VARIATION_CYCLE) {
    compact.vc = preset.sequencer.variationCycle;
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

  return { triggers, velocities };
}

function decodeParams(compact: CompactParams): InstrumentParams {
  return {
    attack: compact.a ?? DEFAULT_PARAMS.attack,
    release: compact.r ?? DEFAULT_PARAMS.release,
    filter: compact.f ?? DEFAULT_PARAMS.filter,
    volume: compact.v ?? DEFAULT_PARAMS.volume,
    pan: compact.p ?? DEFAULT_PARAMS.pan,
    pitch: compact.t ?? DEFAULT_PARAMS.pitch,
    solo: compact.s === 1,
    mute: compact.m === 1,
  };
}

function decodeMasterChain(compact?: CompactMasterChain): MasterChainParams {
  return {
    lowPass: compact?.lp ?? DEFAULT_MASTER_CHAIN.lowPass,
    highPass: compact?.hp ?? DEFAULT_MASTER_CHAIN.highPass,
    phaser: compact?.ph ?? DEFAULT_MASTER_CHAIN.phaser,
    reverb: compact?.rv ?? DEFAULT_MASTER_CHAIN.reverb,
    compThreshold: compact?.ct ?? DEFAULT_MASTER_CHAIN.compThreshold,
    compRatio: compact?.cr ?? DEFAULT_MASTER_CHAIN.compRatio,
    compMix: compact?.cm ?? DEFAULT_MASTER_CHAIN.compMix,
    masterVolume: compact?.mv ?? DEFAULT_MASTER_CHAIN.masterVolume,
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

  const pattern: Pattern = compact.pt.map((voice) => ({
    instrumentIndex: voice.i,
    variations: [decodeStepSequence(voice.a), decodeStepSequence(voice.b)],
  }));

  const instruments = defaultKit.instruments.map((inst, idx: number) => ({
    ...inst,
    params: decodeParams(compact.ip[idx]),
  }));

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
      variationCycle: (compact.vc ?? DEFAULT_VARIATION_CYCLE) as VariationCycle,
    },
    masterChain: decodeMasterChain(compact.mc),
  };
}
