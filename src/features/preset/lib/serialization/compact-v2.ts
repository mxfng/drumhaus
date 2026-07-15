import { Pattern } from "@/core/audio/engine/pattern-types";
import { init } from "@/core/dh";
import { getKitLoader } from "@/core/dhkit";
import {
  CorruptFieldError,
  InvalidFileError,
  migrateV1ToDocument,
  presetDocumentSchema,
  UnknownKitError,
  UnsupportedVersionError,
  type PresetDocument,
} from "@/features/preset/document";
import {
  CHAIN_STRING_PATTERN,
  CompactAccents,
  CompactVoice,
  decodeAccents,
  decodeVoices,
  encodeAccents,
  encodeVoices,
  PACKED_TRIGGER_PATTERN,
  parseChainString,
  stringifyChain,
} from "./pattern-codec";

/**
 * The v2 compact share format: a direct encoding of the domain-unit
 * PresetDocument (docs/preset-persistence.md, "Share encoding").
 *
 * Differences from v1.5:
 * - `v: 2`, dispatched on by urlToDocument.
 * - `k` is the STABLE kit id string ("kit-0"), not the positional index
 *   into KIT_ORDER (decision 12): inserting or reordering registry kits can
 *   never repoint an existing link.
 * - Channel and master params carry DOCUMENT values (seconds, dB, semitones,
 *   0..1 fractions, and the canonical split filter as a `[sideCode, cutoffHz]`
 *   pair; decision 15), sparse against the migrated init() document's
 *   defaults, quantized per the table below.
 * - Nullable volumes (null = silence, the JSON spelling of -Infinity) are
 *   encoded as an explicit JSON `null`.
 * - Decode validates shapes and lengths with the typed errors from
 *   document/errors.ts and finishes with a strict presetDocumentSchema
 *   parse, so corrupt payloads fail typed, never with a TypeError.
 *
 * Pattern data (bit-packed triggers/ratchets/flams/accents, sparse 0-100
 * velocities, chain strings) is shared with the v1.5 codec via
 * pattern-codec.ts; it was already musical-unit data.
 */
const COMPACT_CODEC_VERSION = 2;

const CHANNEL_COUNT = 8;

/**
 * Per-field quantization (decimal places written to the payload).
 *
 * Requirement: decode(encode(doc)) must yield a document whose documentToV1
 * knob values differ from the original's by less than 0.05 knob units (half
 * the 0.1 knob display step).
 *
 * Derivation: quantizing to `p` decimals perturbs the domain value by at
 * most one grid step q = 10^-p (q/2 from rounding; up to q when a
 * near-default value is omitted as sparse and decodes to the default). The
 * knob error is that domain perturbation times the slope of the INVERSE
 * (domain -> knob) mapping, so each field's precision is set by the inverse
 * mapping's steepest region:
 *
 * - Linear fields have a constant inverse slope of 100/span knob units per
 *   domain unit, so the bound is uniform: err <= q * 100 / span.
 * - Exponential fields (decay, compAttack; forward domain =
 *   min + (knob/100)^2 * span) have inverse knob = 100 * sqrt((d - min) /
 *   span). The FORWARD curve is steepest at knob 100, which means the
 *   inverse is steepest at the opposite end: d(knob)/d(domain) =
 *   50 / sqrt((d - min) * span) diverges as d -> min (knob 0), so the
 *   binding region is the domain floor, not knob 100. Worst case over a
 *   grid step at the floor: err <= 100 * sqrt(q / span).
 *
 * The split filter is carried as a `[sideCode, cutoffHz]` pair (sideCode
 * 0 = lowpass, 1 = highpass); its store position is recovered downstream by
 * splitFilterToPosition (position = 49 * sqrt(cutoffHz / 15000) per side).
 * That inverse is steepest at the cutoff floor, so like the exponential
 * fields the bound is worst at cutoffHz -> 0: err <= 49 * sqrt(q / 15000);
 * p = 3 keeps it at ~0.013 knob units, well under 0.05.
 *
 * | field             | key | mapping (inverse slope, worst)       | p | worst knob err |
 * |-------------------|-----|--------------------------------------|---|----------------|
 * | decaySeconds      | d   | exp, span 4.995 s; 100*sqrt(q/span)  | 7 | 0.015          |
 * | filter (cutoffHz) | f   | 49*sqrt(q/15000) at the floor        | 3 | 0.013          |
 * | volumeDb          | v   | linear, span 50 dB; 2 knob/dB        | 2 | 0.02           |
 * | pan               | p   | linear, span 2; 50 knob/unit         | 4 | 0.005          |
 * | tuneSemitones     | t   | linear, span 14 st; 50/7 knob/st     | 3 | 0.008          |
 * | saturation        | s   | linear, span 1; 100 knob/unit        | 4 | 0.01           |
 * | phaser            | ph  | linear, span 1; 100 knob/unit        | 4 | 0.01           |
 * | reverb            | rv  | linear, span 1; 100 knob/unit        | 4 | 0.01           |
 * | compThresholdDb   | ct  | linear, span 40 dB; 2.5 knob/dB      | 2 | 0.025          |
 * | compRatio         | cr  | integer 1..8, carried exactly        | - | 0              |
 * | compAttackSeconds | ca  | exp, span 0.099 s; 100*sqrt(q/span)  | 8 | 0.032          |
 * | compMix           | cm  | linear, span 1; 100 knob/unit        | 4 | 0.01           |
 * | masterVolumeDb    | mv  | linear, span 50 dB; 2 knob/dB        | 2 | 0.02           |
 * | swing (fraction)  | sw  | linear, span 0.375; 266.7 knob/unit  | 4 | 0.027          |
 * | bpm               | bpm | raw domain value in both spaces      | - | 0              |
 * | velocities        |     | v1.5 sparse ints 0-100 (not a knob)  | - | 0.005 velocity |
 */
const PRECISION = {
  decaySeconds: 7,
  filter: 3,
  volumeDb: 2,
  pan: 4,
  tuneSemitones: 3,
  saturation: 4,
  phaser: 4,
  reverb: 4,
  compThresholdDb: 2,
  compAttackSeconds: 8,
  compMix: 4,
  masterVolumeDb: 2,
  swing: 4,
} as const;

/**
 * The sparse baseline: the init preset in document space, computed once via
 * the same migration every ingress uses (mirroring how the v1.5 codec
 * derives its knob-space defaults from init()).
 */
const INIT_DOCUMENT = migrateV1ToDocument(init());

type Channel = PresetDocument["channels"][number];
type Master = PresetDocument["master"];

/** Canonical filter as a compact pair: [sideCode (0=lowpass, 1=highpass), cutoffHz]. */
type CompactFilter = [number, number];

/** Sparse domain-unit channel params; `v: null` spells silence. */
type CompactChannelV2 = {
  d?: number; // decaySeconds
  f?: CompactFilter; // canonical filter [sideCode, cutoffHz]
  v?: number | null; // volumeDb (null = silence)
  p?: number; // pan -1..1
  t?: number; // tuneSemitones -7..7
  s?: number; // solo (1)
  m?: number; // mute (1)
};

/** Sparse domain-unit master params; `mv: null` spells silence. */
type CompactMasterV2 = {
  f?: CompactFilter; // canonical filter [sideCode, cutoffHz]
  s?: number; // saturation 0..1
  ph?: number; // phaser 0..1
  rv?: number; // reverb 0..1
  ct?: number; // compThresholdDb
  cr?: number; // compRatio 1..8 integer
  ca?: number; // compAttackSeconds
  cm?: number; // compMix 0..1
  mv?: number | null; // masterVolumeDb (null = silence)
};

type CompactPresetV2 = {
  v: 2;
  id: string; // preset UUID (minted fresh when sharing)
  n: string; // preset name
  k: string; // STABLE kit id, e.g. "kit-0" (decision 12)
  ip: CompactChannelV2[]; // channel params (8 items, only non-defaults)
  pt: CompactVoice[]; // pattern voices (8 items)
  ac?: CompactAccents; // accent bitmaps [A, B, C, D]
  ch?: string; // chain string (omit if default "A1")
  ce?: number; // chain enabled (omit if default)
  bpm?: number; // omit if init default
  sw?: number; // swing fraction 0..0.375 (omit if init default)
  mc?: CompactMasterV2;
};

// --- ENCODE ---

function quantize(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

/** Compact side code: 0 = lowpass, 1 = highpass. */
function sideCode(side: Channel["filter"]["side"]): number {
  return side === "highpass" ? 1 : 0;
}

/**
 * Sparse canonical filter: the `[sideCode, cutoffHz]` pair, or undefined when
 * it lands on the (quantized) default. cutoffHz is compared quantized so an
 * omission and a written value round-trip to the same value.
 */
function sparseFilter(
  filter: Channel["filter"],
  defaultFilter: Channel["filter"],
): CompactFilter | undefined {
  const side = sideCode(filter.side);
  const cutoff = quantize(filter.cutoffHz, PRECISION.filter);
  if (
    side === sideCode(defaultFilter.side) &&
    cutoff === quantize(defaultFilter.cutoffHz, PRECISION.filter)
  ) {
    return undefined;
  }
  return [side, cutoff];
}

/** Quantized value, or undefined when it lands on the (quantized) default. */
function sparse(
  value: number,
  defaultValue: number,
  decimals: number,
): number | undefined {
  const quantized = quantize(value, decimals);
  return quantized === quantize(defaultValue, decimals) ? undefined : quantized;
}

/** sparse() over nullable volumes: null (silence) is spelled explicitly. */
function sparseNullable(
  value: number | null,
  defaultValue: number | null,
  decimals: number,
): number | null | undefined {
  if (value === null) return defaultValue === null ? undefined : null;
  if (defaultValue === null) return quantize(value, decimals);
  return sparse(value, defaultValue, decimals);
}

function encodeChannel(channel: Channel, defaults: Channel): CompactChannelV2 {
  const compact: CompactChannelV2 = {};

  const d = sparse(
    channel.decaySeconds,
    defaults.decaySeconds,
    PRECISION.decaySeconds,
  );
  const f = sparseFilter(channel.filter, defaults.filter);
  const v = sparseNullable(
    channel.volumeDb,
    defaults.volumeDb,
    PRECISION.volumeDb,
  );
  const p = sparse(channel.pan, defaults.pan, PRECISION.pan);
  const t = sparse(
    channel.tuneSemitones,
    defaults.tuneSemitones,
    PRECISION.tuneSemitones,
  );

  if (d !== undefined) compact.d = d;
  if (f !== undefined) compact.f = f;
  if (v !== undefined) compact.v = v;
  if (p !== undefined) compact.p = p;
  if (t !== undefined) compact.t = t;
  if (channel.solo !== defaults.solo) compact.s = channel.solo ? 1 : 0;
  if (channel.mute !== defaults.mute) compact.m = channel.mute ? 1 : 0;

  return compact;
}

function encodeMaster(
  master: Master,
  defaults: Master,
): CompactMasterV2 | undefined {
  const compact: CompactMasterV2 = {};

  const f = sparseFilter(master.filter, defaults.filter);
  const s = sparse(
    master.saturation,
    defaults.saturation,
    PRECISION.saturation,
  );
  const ph = sparse(master.phaser, defaults.phaser, PRECISION.phaser);
  const rv = sparse(master.reverb, defaults.reverb, PRECISION.reverb);
  const ct = sparse(
    master.compThresholdDb,
    defaults.compThresholdDb,
    PRECISION.compThresholdDb,
  );
  const ca = sparse(
    master.compAttackSeconds,
    defaults.compAttackSeconds,
    PRECISION.compAttackSeconds,
  );
  const cm = sparse(master.compMix, defaults.compMix, PRECISION.compMix);
  const mv = sparseNullable(
    master.masterVolumeDb,
    defaults.masterVolumeDb,
    PRECISION.masterVolumeDb,
  );

  if (f !== undefined) compact.f = f;
  if (s !== undefined) compact.s = s;
  if (ph !== undefined) compact.ph = ph;
  if (rv !== undefined) compact.rv = rv;
  if (ct !== undefined) compact.ct = ct;
  if (master.compRatio !== defaults.compRatio) compact.cr = master.compRatio;
  if (ca !== undefined) compact.ca = ca;
  if (cm !== undefined) compact.cm = cm;
  if (mv !== undefined) compact.mv = mv;

  return Object.keys(compact).length > 0 ? compact : undefined;
}

const DEFAULT_CHAIN_STRING = stringifyChain(INIT_DOCUMENT.playback.chain);

/**
 * Encode a preset document as the v2 compact share payload.
 *
 * @throws {UnknownKitError} If the document's kit id does not resolve in the
 * registry (nothing in the app can currently produce one)
 */
function encodeCompactDocument(document: PresetDocument): CompactPresetV2 {
  if (getKitLoader(document.kit.id) === undefined) {
    throw new UnknownKitError(document.kit.id);
  }

  const compact: CompactPresetV2 = {
    v: COMPACT_CODEC_VERSION,
    id: document.meta.id,
    n: document.meta.name,
    k: document.kit.id,
    ip: document.channels.map((channel, index) =>
      encodeChannel(channel, INIT_DOCUMENT.channels[index]),
    ),
    pt: encodeVoices(document.pattern),
  };

  const accents = encodeAccents(document.pattern.variationMetadata);
  if (accents) {
    compact.ac = accents;
  }

  const chainString = stringifyChain(document.playback.chain);
  if (chainString !== DEFAULT_CHAIN_STRING) {
    compact.ch = chainString;
  }

  if (document.playback.chainEnabled !== INIT_DOCUMENT.playback.chainEnabled) {
    compact.ce = document.playback.chainEnabled ? 1 : 0;
  }

  if (document.transport.bpm !== INIT_DOCUMENT.transport.bpm) {
    compact.bpm = document.transport.bpm;
  }

  const sw = sparse(
    document.transport.swing,
    INIT_DOCUMENT.transport.swing,
    PRECISION.swing,
  );
  if (sw !== undefined) {
    compact.sw = sw;
  }

  const master = encodeMaster(document.master, INIT_DOCUMENT.master);
  if (master) {
    compact.mc = master;
  }

  return compact;
}

// --- DECODE ---

function corrupt(path: string, message: string): never {
  throw new CorruptFieldError(path, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePackedFlags(value: unknown, path: string): void {
  if (typeof value !== "string" || !PACKED_TRIGGER_PATTERN.test(value)) {
    corrupt(path, "expected a 4-character hex step bitmap");
  }
}

function validateStepSequence(value: unknown, path: string): void {
  if (!isRecord(value)) corrupt(path, "expected a step sequence object");

  validatePackedFlags(value.t, `${path}.t`);

  if (value.v !== undefined) {
    if (!isRecord(value.v)) corrupt(`${path}.v`, "expected a velocity map");
    for (const [key, velocity] of Object.entries(value.v)) {
      const step = Number(key);
      if (!Number.isInteger(step) || step < 0 || step >= 16) {
        corrupt(`${path}.v.${key}`, "velocity step index out of range");
      }
      if (typeof velocity !== "number" || !Number.isFinite(velocity)) {
        corrupt(`${path}.v.${key}`, "expected a numeric velocity");
      }
    }
  }

  if (value.n !== undefined && typeof value.n !== "number") {
    corrupt(`${path}.n`, "expected a numeric timing nudge");
  }
  if (value.r !== undefined) validatePackedFlags(value.r, `${path}.r`);
  if (value.f !== undefined) validatePackedFlags(value.f, `${path}.f`);
}

function validateVoices(value: unknown): asserts value is CompactVoice[] {
  if (!Array.isArray(value) || value.length !== CHANNEL_COUNT) {
    corrupt("pt", `expected ${CHANNEL_COUNT} pattern voices`);
  }
  value.forEach((voice, index) => {
    if (!isRecord(voice)) corrupt(`pt.${index}`, "expected a voice object");
    if (typeof voice.i !== "number") {
      corrupt(`pt.${index}.i`, "expected a numeric instrument index");
    }
    validateStepSequence(voice.a, `pt.${index}.a`);
    validateStepSequence(voice.b, `pt.${index}.b`);
    if (voice.c !== undefined) validateStepSequence(voice.c, `pt.${index}.c`);
    if (voice.d !== undefined) validateStepSequence(voice.d, `pt.${index}.d`);
  });
}

function validateChannels(value: unknown): asserts value is CompactChannelV2[] {
  if (!Array.isArray(value) || value.length !== CHANNEL_COUNT) {
    corrupt("ip", `expected ${CHANNEL_COUNT} channel param objects`);
  }
  value.forEach((channel, index) => {
    if (!isRecord(channel)) {
      corrupt(`ip.${index}`, "expected a channel params object");
    }
  });
}

function validateAccents(value: unknown): CompactAccents | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 4) {
    corrupt("ac", "expected up to 4 accent bitmaps");
  }
  const accents = value.map((entry, index) => {
    if (entry === undefined || entry === null) return undefined;
    validatePackedFlags(entry, `ac.${index}`);
    return entry as string;
  });
  return accents as CompactAccents;
}

/**
 * Decode the compact `[sideCode, cutoffHz]` pair to a canonical filter, or
 * fall back to the default when absent. A malformed pair fails typed (never a
 * TypeError); the final schema parse still range-checks cutoffHz.
 */
function decodeFilter(
  f: CompactFilter | undefined,
  defaultFilter: Channel["filter"],
  path: string,
): Channel["filter"] {
  if (f === undefined) return defaultFilter;
  if (
    !Array.isArray(f) ||
    f.length !== 2 ||
    typeof f[0] !== "number" ||
    typeof f[1] !== "number"
  ) {
    corrupt(path, "expected a [sideCode, cutoffHz] filter pair");
  }
  if (f[0] !== 0 && f[0] !== 1) {
    corrupt(path, "filter side code must be 0 (lowpass) or 1 (highpass)");
  }
  return { side: f[0] === 1 ? "highpass" : "lowpass", cutoffHz: f[1] };
}

function decodeChannel(
  compact: CompactChannelV2,
  defaults: Channel,
  index: number,
): Channel {
  return {
    decaySeconds: compact.d ?? defaults.decaySeconds,
    filter: decodeFilter(compact.f, defaults.filter, `ip.${index}.f`),
    volumeDb: compact.v !== undefined ? compact.v : defaults.volumeDb,
    pan: compact.p ?? defaults.pan,
    tuneSemitones: compact.t ?? defaults.tuneSemitones,
    solo: compact.s === 1,
    mute: compact.m === 1,
  };
}

function decodeMaster(
  compact: CompactMasterV2 | undefined,
  defaults: Master,
): Master {
  return {
    filter: decodeFilter(compact?.f, defaults.filter, "mc.f"),
    saturation: compact?.s ?? defaults.saturation,
    phaser: compact?.ph ?? defaults.phaser,
    reverb: compact?.rv ?? defaults.reverb,
    compThresholdDb: compact?.ct ?? defaults.compThresholdDb,
    compRatio: compact?.cr ?? defaults.compRatio,
    compAttackSeconds: compact?.ca ?? defaults.compAttackSeconds,
    compMix: compact?.cm ?? defaults.compMix,
    masterVolumeDb:
      compact?.mv !== undefined ? compact.mv : defaults.masterVolumeDb,
  };
}

/**
 * Decode a parsed v2 compact payload into a validated PresetDocument.
 *
 * @throws {InvalidFileError} If the payload is not an object
 * @throws {UnsupportedVersionError} If the payload's `v` is not 2
 * @throws {UnknownKitError} If the kit id does not resolve in the registry
 * @throws {CorruptFieldError} If any field fails shape, length, grammar, or
 * (via the final presetDocumentSchema parse) range validation
 */
function decodeCompactDocument(data: unknown): PresetDocument {
  if (!isRecord(data)) {
    throw new InvalidFileError("Shared preset payload must be an object");
  }
  if (data.v !== COMPACT_CODEC_VERSION) {
    throw new UnsupportedVersionError(data.v);
  }

  if (typeof data.id !== "string") corrupt("id", "expected a preset id string");
  if (data.k === undefined) throw new UnknownKitError(undefined);
  if (typeof data.k !== "string") corrupt("k", "expected a kit id string");
  if (getKitLoader(data.k) === undefined) {
    throw new UnknownKitError(data.k);
  }
  if (data.n !== undefined && typeof data.n !== "string") {
    corrupt("n", "expected a preset name string");
  }

  validateChannels(data.ip);
  validateVoices(data.pt);
  const accents = validateAccents(data.ac);

  if (data.ch !== undefined) {
    if (typeof data.ch !== "string" || !CHAIN_STRING_PATTERN.test(data.ch)) {
      corrupt("ch", "expected a chain string of 1-8 [A-D][1-8] pairs");
    }
  }
  if (data.ce !== undefined && data.ce !== 0 && data.ce !== 1) {
    corrupt("ce", "expected chain-enabled flag 0 or 1");
  }
  if (data.bpm !== undefined && typeof data.bpm !== "number") {
    corrupt("bpm", "expected a numeric bpm");
  }
  if (data.sw !== undefined && typeof data.sw !== "number") {
    corrupt("sw", "expected a numeric swing fraction");
  }
  if (data.mc !== undefined && !isRecord(data.mc)) {
    corrupt("mc", "expected a master params object");
  }

  const pattern: Pattern = {
    voices: decodeVoices(data.pt),
    variationMetadata: decodeAccents(accents),
  };

  const now = new Date().toISOString();

  const candidate: PresetDocument = {
    kind: INIT_DOCUMENT.kind,
    version: INIT_DOCUMENT.version,
    meta: {
      id: data.id,
      name: data.n || "Shared Preset",
      createdAt: now,
      updatedAt: now,
    },
    kit: { id: data.k },
    channels: data.ip.map((channel, index) =>
      decodeChannel(channel, INIT_DOCUMENT.channels[index], index),
    ) as PresetDocument["channels"],
    pattern,
    playback: {
      chain:
        data.ch !== undefined
          ? parseChainString(data.ch)
          : INIT_DOCUMENT.playback.chain,
      chainEnabled:
        data.ce !== undefined
          ? data.ce === 1
          : INIT_DOCUMENT.playback.chainEnabled,
    },
    transport: {
      bpm: data.bpm ?? INIT_DOCUMENT.transport.bpm,
      swing: data.sw ?? INIT_DOCUMENT.transport.swing,
    },
    master: decodeMaster(
      data.mc as CompactMasterV2 | undefined,
      INIT_DOCUMENT.master,
    ),
  };

  const result = presetDocumentSchema.safeParse(candidate);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new CorruptFieldError(issue.path.join("."), issue.message);
  }
  return result.data;
}

export { COMPACT_CODEC_VERSION, decodeCompactDocument, encodeCompactDocument };
export type { CompactChannelV2, CompactMasterV2, CompactPresetV2 };
