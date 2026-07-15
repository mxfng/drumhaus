import { DEFAULT_VELOCITY, STEP_COUNT } from "@/core/audio/engine/constants";
import {
  clampVariationId,
  Pattern,
  PatternChain,
  sanitizeChain,
  StepSequence,
  VariationId,
} from "@/core/audio/engine/pattern-types";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";

/**
 * Pattern-data helpers shared by every version of the compact share codec:
 * bit-packed trigger/ratchet/flam/accent strings, sparse quantized
 * velocities, and the chain string grammar. Pattern data is already musical
 * (booleans, 0..1 velocities, nudge steps), so these encodings are identical
 * in the knob-space v1.5 codec and the domain-space v2 codec.
 */

const PACKED_TRIGGER_HEX_LENGTH = Math.ceil(STEP_COUNT / 4);

/**
 * Exactly one bit-packed step-flag string: 4 lowercase/uppercase hex chars
 * (16 steps). Used by the v2 decoder to reject corrupt payloads before
 * unpacking (parseInt would silently produce NaN -> all-false).
 */
const PACKED_TRIGGER_PATTERN = new RegExp(
  `^[0-9a-fA-F]{${PACKED_TRIGGER_HEX_LENGTH}}$`,
);

// --- BIT PACKING FOR STEP FLAGS ---

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

// --- CHAIN STRINGS ---

/**
 * Strict chain grammar: 1-8 pairs of variation label (A-D) + repeat digit
 * (1-8), e.g. "A2B1D3". The v1.5 decoder predates this and parses leniently;
 * the v2 decoder validates against it before parsing.
 */
const CHAIN_STRING_PATTERN = /^([A-D][1-8]){1,8}$/;

function stringifyChain(chain: PatternChain): string {
  return sanitizeChain(chain)
    .steps.map(
      ({ variation, repeats }) => `${VARIATION_LABELS[variation]}${repeats}`,
    )
    .join("");
}

/**
 * Parse a chain string back into a sanitized PatternChain. Lenient by
 * design (unknown labels skipped, malformed repeats default to 1): the
 * v1.5 decoder has always behaved this way. v2 rejects malformed strings
 * up front via CHAIN_STRING_PATTERN, so leniency never engages there.
 */
function parseChainString(chainString: string): PatternChain {
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

// --- STEP SEQUENCES ---

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

/** Accent bitmaps per variation [A, B, C, D]; entries omitted when empty. */
type CompactAccents = [string?, string?, string?, string?];

const EMPTY_TRIGGERS = Array(STEP_COUNT).fill(false);
const EMPTY_COMPACT_STEP: CompactStepSequence = {
  t: packTriggers(EMPTY_TRIGGERS),
};

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

// --- VOICES AND ACCENTS ---

function encodeVoices(pattern: Pattern): CompactVoice[] {
  return pattern.voices.map((voice) => {
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
  });
}

function decodeVoices(voices: CompactVoice[]): Pattern["voices"] {
  return voices.map((voice) => ({
    instrumentIndex: voice.i,
    variations: [
      decodeStepSequence(voice.a),
      decodeStepSequence(voice.b),
      voice.c
        ? decodeStepSequence(voice.c)
        : decodeStepSequence(EMPTY_COMPACT_STEP),
      voice.d
        ? decodeStepSequence(voice.d)
        : decodeStepSequence(EMPTY_COMPACT_STEP),
    ],
  }));
}

function encodeAccents(
  variationMetadata: Pattern["variationMetadata"],
): CompactAccents | undefined {
  const packed = variationMetadata.map(({ accent }) =>
    accent.some(Boolean) ? packTriggers(accent) : undefined,
  );
  if (packed.every((entry) => entry === undefined)) return undefined;
  return packed as CompactAccents;
}

function decodeAccents(
  ac: CompactAccents | undefined,
): Pattern["variationMetadata"] {
  const decode = (entry: string | undefined) => ({
    accent: entry ? unpackTriggers(entry) : Array(STEP_COUNT).fill(false),
  });
  return [decode(ac?.[0]), decode(ac?.[1]), decode(ac?.[2]), decode(ac?.[3])];
}

export {
  CHAIN_STRING_PATTERN,
  decodeAccents,
  decodeStepSequence,
  decodeVoices,
  dequantizeVelocity,
  EMPTY_COMPACT_STEP,
  encodeAccents,
  encodeStepSequence,
  encodeVoices,
  isSequenceEmpty,
  PACKED_TRIGGER_PATTERN,
  packTriggers,
  parseChainString,
  quantizeVelocity,
  stringifyChain,
  unpackTriggers,
};
export type { CompactAccents, CompactStepSequence, CompactVoice };
