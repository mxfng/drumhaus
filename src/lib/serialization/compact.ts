import type { InstrumentParams } from "@/types/instrument";
import type { Pattern, StepSequence } from "@/types/pattern";
import type { PresetFileV1 } from "@/types/preset";

/**
 * Ultra-compact preset format with aggressive optimizations:
 * - Bit-packed triggers (16 bools → 4 hex chars)
 * - Quantized velocities (floats → ints 0-100)
 * - Single-letter keys
 * - Kit ID as single digit (0-9)
 * - Omit default values
 */

// ============================================================================
// KIT ID MAPPING (10 default kits → 0-9)
// ============================================================================

const KIT_ID_MAP: Record<string, string> = {
  "kit-drumhaus": "0",
  "kit-organic": "1",
  "kit-funk": "2",
  "kit-rnb": "3",
  "kit-trap": "4",
  "kit-eighties": "5",
  "kit-tech_house": "6",
  "kit-techno": "7",
  "kit-indie": "8",
  "kit-jungle": "9",
};

const KIT_ID_REVERSE: Record<string, string> = {
  "0": "kit-drumhaus",
  "1": "kit-organic",
  "2": "kit-funk",
  "3": "kit-rnb",
  "4": "kit-trap",
  "5": "kit-eighties",
  "6": "kit-tech_house",
  "7": "kit-techno",
  "8": "kit-indie",
  "9": "kit-jungle",
};

// ============================================================================
// DEFAULT VALUES (omit these to save space)
// ============================================================================

const DEFAULT_PARAMS: InstrumentParams = {
  attack: 0,
  release: 100,
  filter: 50,
  volume: 92,
  pan: 50,
  pitch: 50,
  solo: false,
  mute: false,
};

const DEFAULT_MASTER_CHAIN = {
  lowPass: 100,
  hiPass: 0,
  phaser: 0,
  reverb: 0,
  compThreshold: 0,
  compRatio: 0,
  masterVolume: 92,
};

// ============================================================================
// BIT PACKING FOR TRIGGERS
// ============================================================================

/**
 * Pack 16 boolean triggers into a 4-character hex string
 * [true,false,false,false,true,false,false,false,...] → "9000"
 */
function packTriggers(triggers: boolean[]): string {
  let bits = 0;
  for (let i = 0; i < 16; i++) {
    if (triggers[i]) {
      bits |= 1 << i;
    }
  }
  return bits.toString(16).padStart(4, "0");
}

/**
 * Unpack 4-character hex string into 16 boolean triggers
 * "9000" → [true,false,false,false,true,false,false,false,...]
 */
function unpackTriggers(hex: string): boolean[] {
  const bits = parseInt(hex, 16);
  const triggers: boolean[] = [];
  for (let i = 0; i < 16; i++) {
    triggers.push((bits & (1 << i)) !== 0);
  }
  return triggers;
}

// ============================================================================
// VELOCITY QUANTIZATION
// ============================================================================

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

// ============================================================================
// COMPACT ENCODING
// ============================================================================

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
  mc?: Partial<{
    // master chain (omit defaults)
    lp: number; // lowPass
    hp: number; // hiPass
    ph: number; // phaser
    rv: number; // reverb
    ct: number; // compThreshold
    cr: number; // compRatio
    mv: number; // masterVolume
  }>;
};

// ============================================================================
// ENCODE FUNCTIONS
// ============================================================================

function encodeStepSequence(seq: StepSequence): CompactStepSequence {
  const compact: CompactStepSequence = {
    t: packTriggers(seq.triggers),
  };

  // Sparse velocities (only non-1.0, quantized)
  const velocities: Record<string, number> = {};
  seq.velocities.forEach((vel, idx) => {
    if (vel !== 1.0) {
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

export function encodeCompactPreset(preset: PresetFileV1): CompactPreset {
  const kitId = KIT_ID_MAP[preset.kit.meta.id];
  if (!kitId) {
    throw new Error(
      `Unknown kit ID: ${preset.kit.meta.id}. Only default kits can be shared.`,
    );
  }

  const compact: CompactPreset = {
    id: preset.meta.id, // Include the UUID (generated fresh when sharing)
    k: kitId,
    ip: preset.kit.instruments.map((inst) => encodeParams(inst.params)),
    pt: preset.sequencer.pattern.map((voice) => ({
      i: voice.instrumentIndex,
      a: encodeStepSequence(voice.variations[0]),
      b: encodeStepSequence(voice.variations[1]),
    })),
  };

  // Always include preset name
  compact.n = preset.meta.name;

  if (preset.sequencer.variationCycle !== "AB") {
    compact.vc = preset.sequencer.variationCycle;
  }

  if (preset.transport.bpm !== 120) {
    compact.bpm = preset.transport.bpm;
  }

  if (preset.transport.swing !== 0) {
    compact.sw = preset.transport.swing;
  }

  // Master chain (only non-defaults)
  const mc: any = {};
  const chain = preset.masterChain;
  if (chain.lowPass !== DEFAULT_MASTER_CHAIN.lowPass) mc.lp = chain.lowPass;
  if (chain.hiPass !== DEFAULT_MASTER_CHAIN.hiPass) mc.hp = chain.hiPass;
  if (chain.phaser !== DEFAULT_MASTER_CHAIN.phaser) mc.ph = chain.phaser;
  if (chain.reverb !== DEFAULT_MASTER_CHAIN.reverb) mc.rv = chain.reverb;
  if (chain.compThreshold !== DEFAULT_MASTER_CHAIN.compThreshold)
    mc.ct = chain.compThreshold;
  if (chain.compRatio !== DEFAULT_MASTER_CHAIN.compRatio)
    mc.cr = chain.compRatio;
  if (chain.masterVolume !== DEFAULT_MASTER_CHAIN.masterVolume)
    mc.mv = chain.masterVolume;

  if (Object.keys(mc).length > 0) {
    compact.mc = mc;
  }

  return compact;
}

// ============================================================================
// DECODE FUNCTIONS
// ============================================================================

function decodeStepSequence(compact: CompactStepSequence): StepSequence {
  const triggers = unpackTriggers(compact.t);
  const velocities = Array(16).fill(1.0);

  if (compact.v) {
    Object.entries(compact.v).forEach(([idx, quantized]) => {
      velocities[parseInt(idx)] = dequantizeVelocity(quantized);
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

export function decodeCompactPreset(
  compact: CompactPreset,
  kitLoader: (kitId: string) => any,
): PresetFileV1 {
  const kitId = KIT_ID_REVERSE[compact.k];
  if (!kitId) {
    throw new Error(`Unknown kit code: ${compact.k}`);
  }

  const defaultKit = kitLoader(kitId);

  const pattern: Pattern = compact.pt.map((voice) => ({
    instrumentIndex: voice.i,
    variations: [decodeStepSequence(voice.a), decodeStepSequence(voice.b)],
  }));

  const instruments = defaultKit.instruments.map((inst: any, idx: number) => ({
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
      bpm: compact.bpm ?? 120,
      swing: compact.sw ?? 0,
    },
    sequencer: {
      pattern,
      variationCycle: (compact.vc as any) || "AB",
    },
    masterChain: {
      lowPass: compact.mc?.lp ?? DEFAULT_MASTER_CHAIN.lowPass,
      hiPass: compact.mc?.hp ?? DEFAULT_MASTER_CHAIN.hiPass,
      phaser: compact.mc?.ph ?? DEFAULT_MASTER_CHAIN.phaser,
      reverb: compact.mc?.rv ?? DEFAULT_MASTER_CHAIN.reverb,
      compThreshold: compact.mc?.ct ?? DEFAULT_MASTER_CHAIN.compThreshold,
      compRatio: compact.mc?.cr ?? DEFAULT_MASTER_CHAIN.compRatio,
      masterVolume: compact.mc?.mv ?? DEFAULT_MASTER_CHAIN.masterVolume,
    },
  };
}
