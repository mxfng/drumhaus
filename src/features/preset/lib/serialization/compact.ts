import { Pattern } from "@/core/audio/engine/pattern-types";
import { init } from "@/core/dh";
import { getKitLoader } from "@/core/dhkit";
import {
  CorruptFieldError,
  InvalidFileError,
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
 * The share-link compact codec: the single, latest-only encoding of the
 * domain-unit PresetDocument (docs/preset-persistence.md, "Share encoding").
 *
 * There is exactly ONE share codec. Outbound links always encode this shape;
 * inbound links are read only at this exact version and every other `v`
 * (older v1.5 knob-space links and pre-#269 versionless links) is refused
 * with UnsupportedVersionError (#373). No legacy share decode remains.
 *
 * Shape:
 * - `v: 3` (see COMPACT_CODEC_VERSION below), dispatched on by urlToDocument.
 * - `k` is the STABLE kit id string ("kit-0"), not a positional index into
 *   KIT_ORDER (decision 12): inserting or reordering registry kits can never
 *   repoint an existing link.
 * - Channel and master params carry DOCUMENT values (seconds, dB, semitones,
 *   0..1 fractions, and the canonical split filter as a `[sideCode, cutoffHz]`
 *   pair; decision 15), sparse against the init() document's defaults,
 *   quantized per the table below.
 * - Nullable volumes (null = silence, the JSON spelling of -Infinity) are
 *   encoded as an explicit JSON `null`.
 * - Decode validates shapes and lengths with the typed errors from
 *   document/errors.ts and finishes with a strict presetDocumentSchema
 *   parse, so corrupt payloads fail typed, never with a TypeError.
 *
 * Pattern data (bit-packed triggers/ratchets/flams/accents, sparse 0-100
 * velocities, chain strings) is encoded via pattern-codec.ts; it was already
 * musical-unit data.
 */
/**
 * The one share-codec version. Its label is honest: it denotes exactly the
 * single canonical payload shape above, and nothing else.
 *
 * History (#368): the codec's `v: 2` label covered two mutually incompatible
 * filter shapes across the unreleased #357 epic - a scalar 0-100 position
 * (#350) and then the canonical `[sideCode, cutoffHz]` pair (#361) - with no
 * bump. Collapsing to a single codec (#373) is the moment to make the label
 * truthful: the sole canonical shape takes a fresh version (3) that was never
 * used for any other shape, so version -> shape is now 1:1. Any `v: 2`
 * payload (scalar or canonical) is uniformly refused, never decoded, so the
 * old ambiguity can never resurface. No non-latest link was ever released, so
 * nothing in the wild breaks.
 */
const COMPACT_CODEC_VERSION = 3;

const CHANNEL_COUNT = 8;

/**
 * Per-field quantization (decimal places written to the payload).
 *
 * Requirement: decode(encode(doc)) must yield a document whose canonical
 * fields differ from the original's by no more than one quantization grid
 * step, each measured in that field's OWN canonical unit - there is no
 * further conversion downstream of this table.
 *
 * Derivation: quantizing a value to `p` decimals (see `quantize` below) rounds
 * it to the nearest multiple of q = 10^-p, so it can move the value by at
 * most q. `sparse`/`sparseFilter` compare the quantized value against the
 * quantized default and omit the field when they're equal, so a near-default
 * original can also decode to the raw (unquantized) default - which, by the
 * same equality, lands within that same q of the original. Either path is
 * bounded by q, so p alone sets each field's worst-case round-trip error:
 * err <= 10^-p in the field's own unit. This is exactly what
 * `expectCanonicalRoundTrip` in url-codec.test.ts asserts.
 *
 * The split filter's cutoffHz is carried directly in Hz (no widget position
 * involved in this codec - that curve lives in the param-control filter
 * descriptor, src/shared/param-control/descriptors/filter.ts, which shapes
 * position exponentially over [20, 15000] Hz and is irrelevant to this
 * table). p = 3 leaves sub-Hz precision, far finer than the ear resolves.
 *
 * | field             | key | canonical unit                | p | tolerance |
 * |-------------------|-----|--------------------------------|---|-----------|
 * | decaySeconds      | d   | seconds                        | 7 | 1e-7 s    |
 * | filter (cutoffHz) | f   | Hz                             | 3 | 1e-3 Hz   |
 * | volumeDb          | v   | dB                             | 2 | 1e-2 dB   |
 * | pan               | p   | fraction, -1..1                | 4 | 1e-4      |
 * | tuneSemitones     | t   | semitones                      | 3 | 1e-3 st   |
 * | saturation        | s   | fraction, 0..1                 | 4 | 1e-4      |
 * | phaser            | ph  | fraction, 0..1                 | 4 | 1e-4      |
 * | reverb            | rv  | fraction, 0..1                 | 4 | 1e-4      |
 * | compThresholdDb   | ct  | dB                             | 2 | 1e-2 dB   |
 * | compRatio         | cr  | integer 1..8, carried exactly  | - | 0         |
 * | compAttackSeconds | ca  | seconds                        | 8 | 1e-8 s    |
 * | compMix           | cm  | fraction, 0..1                 | 4 | 1e-4      |
 * | masterVolumeDb    | mv  | dB                             | 2 | 1e-2 dB   |
 * | swing (fraction)  | sw  | fraction, 0..0.375             | 4 | 1e-4      |
 * | bpm               | bpm | raw domain value, carried exactly | - | 0      |
 * | velocities        |     | sparse ints 0-100 (pattern-codec, not this table) | - | 0.005 fraction |
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
 * The sparse baseline: the init preset, which is already a canonical document.
 */
const INIT_DOCUMENT = init();

type Channel = PresetDocument["channels"][number];
type Master = PresetDocument["master"];

/** Canonical filter as a compact pair: [sideCode (0=lowpass, 1=highpass), cutoffHz]. */
type CompactFilter = [number, number];

/** Sparse domain-unit channel params; `v: null` spells silence. */
type CompactChannel = {
  d?: number; // decaySeconds
  f?: CompactFilter; // canonical filter [sideCode, cutoffHz]
  v?: number | null; // volumeDb (null = silence)
  p?: number; // pan -1..1
  t?: number; // tuneSemitones -7..7
  s?: number; // solo (1)
  m?: number; // mute (1)
};

/** Sparse domain-unit master params; `mv: null` spells silence. */
type CompactMaster = {
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

type CompactPreset = {
  v: 3;
  id: string; // preset UUID (minted fresh when sharing)
  n: string; // preset name
  k: string; // STABLE kit id, e.g. "kit-0" (decision 12)
  ip: CompactChannel[]; // channel params (8 items, only non-defaults)
  pt: CompactVoice[]; // pattern voices (8 items)
  ac?: CompactAccents; // accent bitmaps [A, B, C, D]
  ch?: string; // chain string (omit if default "A1")
  ce?: number; // chain enabled (omit if default)
  bpm?: number; // omit if init default
  sw?: number; // swing fraction 0..0.375 (omit if init default)
  mc?: CompactMaster;
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

function encodeChannel(channel: Channel, defaults: Channel): CompactChannel {
  const compact: CompactChannel = {};

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
): CompactMaster | undefined {
  const compact: CompactMaster = {};

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
 * Encode a preset document as the compact share payload (`v: 3`).
 *
 * @throws {UnknownKitError} If the document's kit id does not resolve in the
 * registry (nothing in the app can currently produce one)
 */
function encodeCompactDocument(document: PresetDocument): CompactPreset {
  if (getKitLoader(document.kit.id) === undefined) {
    throw new UnknownKitError(document.kit.id);
  }

  const compact: CompactPreset = {
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

function validateChannels(value: unknown): asserts value is CompactChannel[] {
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
  compact: CompactChannel,
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
  compact: CompactMaster | undefined,
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
 * Decode a parsed compact payload (`v: 3`) into a validated PresetDocument.
 *
 * @throws {InvalidFileError} If the payload is not an object
 * @throws {UnsupportedVersionError} If the payload's `v` is not the single
 * current COMPACT_CODEC_VERSION
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
      data.mc as CompactMaster | undefined,
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
export type { CompactChannel, CompactMaster, CompactPreset };
