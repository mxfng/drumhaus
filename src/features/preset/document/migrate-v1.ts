/**
 * The single 1-to-2 migration: PresetFileV1 -> PresetDocument.
 *
 * This is where the entire v1 legacy is absorbed in one step (decision 1):
 * the field-presence heuristics (param renames, lowPass/highPass,
 * variationCycle, array-shaped patterns) via the existing runtime migrators,
 * the knob-to-domain conversion under the frozen v1 curves (decision 11),
 * the embedded-kit dereference (decision 12), the swing knob-to-fraction
 * conversion, and the macro folding (decision 15).
 */

import {
  DEFAULT_CHAIN,
  sanitizeChain,
} from "@/core/audio/engine/pattern-types";
import { getKitLoader } from "@/core/dhkit";
import type { InstrumentParams } from "@/features/instrument/types/instrument";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { legacyCycleToChain } from "@/features/sequencer/lib/chain";
import {
  migrateInstruments,
  migrateMasterChainParams,
  migratePattern,
} from "@/features/sequencer/lib/migrations";
import { clamp } from "@/shared/lib/utils";
import {
  PRESET_DOCUMENT_KIND,
  PRESET_DOCUMENT_VERSION,
  presetDocumentSchema,
  type PresetDocument,
} from "./document";
import { UnknownKitError } from "./errors";

/**
 * Deterministic stand-in for v1 timestamps that were missing or not strings,
 * so migrating the same file always yields the same document (golden tests
 * depend on this).
 */
const V1_TIMESTAMP_SENTINEL = "1970-01-01T00:00:00.000Z";

// --- Frozen v1 curves -------------------------------------------------------
//
// FROZEN-CURVE CONTRACT (decision 11): these constants and functions are the
// permanent interpretation of v1 knob values. They intentionally duplicate
// the live mappings in src/core/audio/bridge/knob-to-domain.ts and
// src/shared/knob/lib/* as of the moment v1 was retired, and they must NEVER
// be re-pointed at those modules or edited to track them. If the app's knob
// curves are ever retuned, that retune is a pure UI concern; old v1 files
// must keep converting with the curves their authors heard, which is exactly
// what this block preserves. The parity test in migrate-v1.test.ts asserts
// frozen === live today; on a deliberate retune, the TEST gets updated to
// pin these frozen values, never this file.
//
// Outputs are clamped into the document schema's ranges so float noise at
// the range edges cannot fail the strict parse.

const V1_DECAY_RANGE_SECONDS: [number, number] = [0.005, 5];
const V1_VOLUME_RANGE_DB: [number, number] = [-46, 4];
const V1_PAN_RANGE: [number, number] = [-1, 1];
const V1_TUNE_SEMITONE_RANGE = 7;
const V1_COMP_THRESHOLD_RANGE_DB: [number, number] = [-40, 0];
const V1_COMP_RATIO_RANGE: [number, number] = [1, 8];
const V1_COMP_ATTACK_RANGE_SECONDS: [number, number] = [0.001, 0.1];
const V1_UNIT_RANGE: [number, number] = [0, 1];
// Swing is frozen at the v1.5 interpretation, not v1: validatePresetFileV1
// migrates v1 swing knobs to v1.5 space (k * 4/3, clamped; #269) before this
// module runs, so the knob reaching swingFraction always means k/100 * 0.375.
// The composition reproduces #269's feel-preserving intent for original v1
// files: min(k/100 * 0.5, 0.375).
const V1_SWING_MAX = 0.375;
const V1_EXP_CURVE_POWER = 2;

function frozenLinear(knob: number, range: [number, number]): number {
  const [min, max] = range;
  return clamp(min + (knob / 100) * (max - min), min, max);
}

function frozenExponential(knob: number, range: [number, number]): number {
  const [min, max] = range;
  const curved = Math.pow(knob / 100, V1_EXP_CURVE_POWER);
  return clamp(min + curved * (max - min), min, max);
}

/** Knob 0 means silence; null is the JSON-safe spelling of -Infinity. */
function frozenVolumeDb(knob: number): number | null {
  if (knob === 0) return null;
  return frozenLinear(knob, V1_VOLUME_RANGE_DB);
}

/**
 * The frozen v1 knob-to-domain conversions, exported only for the parity
 * test (see the frozen-curve contract above).
 */
const frozenV1Curves = {
  decaySeconds: (knob: number): number =>
    frozenExponential(knob, V1_DECAY_RANGE_SECONDS),
  /** Split-filter positions are identity: the 0-100 knob IS the domain. */
  filterPosition: (knob: number): number => clamp(knob, 0, 100),
  volumeDb: frozenVolumeDb,
  pan: (knob: number): number => frozenLinear(knob, V1_PAN_RANGE),
  /**
   * Semitone offset straight from the knob geometry, NOT via the Hz value
   * the bridge computes: the document stores musical intent, and Hz would
   * bake in the sample's base pitch (decision 15).
   */
  tuneSemitones: (knob: number): number =>
    clamp(
      ((clamp(knob, 0, 100) - 50) / 50) * V1_TUNE_SEMITONE_RANGE,
      -V1_TUNE_SEMITONE_RANGE,
      V1_TUNE_SEMITONE_RANGE,
    ),
  /** Macro amounts store the wet fraction; the recipe stays engine-side. */
  saturation: (knob: number): number => frozenLinear(knob, V1_UNIT_RANGE),
  phaser: (knob: number): number => frozenLinear(knob, V1_UNIT_RANGE),
  reverb: (knob: number): number => frozenLinear(knob, V1_UNIT_RANGE),
  compThresholdDb: (knob: number): number =>
    frozenLinear(knob, V1_COMP_THRESHOLD_RANGE_DB),
  compRatio: (knob: number): number =>
    Math.round(frozenLinear(knob, V1_COMP_RATIO_RANGE)),
  compAttackSeconds: (knob: number): number =>
    frozenExponential(knob, V1_COMP_ATTACK_RANGE_SECONDS),
  compMix: (knob: number): number => frozenLinear(knob, V1_UNIT_RANGE),
  masterVolumeDb: frozenVolumeDb,
  swingFraction: (knob: number): number =>
    clamp((knob / 100) * V1_SWING_MAX, 0, V1_SWING_MAX),
};

// --- Kit dereference --------------------------------------------------------

/**
 * Pre-registry kit ids, mapped to the stable ids the registry has used since
 * the kit library audit (commit e2694c2d, 2025-12-18) renamed them. Every
 * alias was verified sample-path-identical across the rename, so the sonic
 * content is unchanged and the mapping honors decision 12's "never silently
 * substitute sounds". The old "kit-techno" is deliberately absent: that
 * kit's samples were replaced wholesale in the same commit, so presets
 * referencing it fail with UnknownKitError rather than sounding different.
 */
const LEGACY_KIT_ID_ALIASES: Record<string, string> = {
  "kit-drumhaus": "kit-0",
  "kit-organic": "kit-3",
  "kit-indie": "kit-4",
  "kit-rnb": "kit-5",
  "kit-funk": "kit-6",
  "kit-eighties": "kit-7",
  "kit-tech-house": "kit-8",
  "kit-trap": "kit-10",
  "kit-jungle": "kit-11",
};

/**
 * Decision 12: the embedded kit copy is dropped and only the registry
 * reference survives; a missing or unresolvable kit id is a hard failure.
 */
function resolveKitId(kit: PresetFileV1["kit"]): string {
  const rawId = (kit.meta as { id?: unknown } | undefined)?.id;
  const candidate =
    typeof rawId === "string"
      ? (LEGACY_KIT_ID_ALIASES[rawId] ?? rawId)
      : undefined;
  if (candidate === undefined || getKitLoader(candidate) === undefined) {
    throw new UnknownKitError(typeof rawId === "string" ? rawId : undefined);
  }
  return candidate;
}

// --- Section conversions ----------------------------------------------------

function channelFromKnobParams(params: InstrumentParams) {
  return {
    decaySeconds: frozenV1Curves.decaySeconds(params.decay),
    filter: frozenV1Curves.filterPosition(params.filter),
    volumeDb: frozenV1Curves.volumeDb(params.volume),
    pan: frozenV1Curves.pan(params.pan),
    tuneSemitones: frozenV1Curves.tuneSemitones(params.tune),
    mute: params.mute,
    solo: params.solo,
  };
}

function masterFromV1(masterChain: PresetFileV1["masterChain"]) {
  // The declared type is knob-space MasterChainParams, but the tolerant v1
  // schema lets legacy key sets through; inspect the raw keys.
  const raw = masterChain as unknown as Record<string, unknown>;
  // The earliest era (2025-11-18 to 2025-11-20) spelled the high-pass knob
  // "hiPass"; migrateMasterChainParams only ever learned "highPass", so
  // today's loader silently drops the value. Honoring it here is a
  // deliberate, documented behavior fix scoped to this migration:
  // corpus.test.ts pins the old migrator behavior, so the pre-mapping lives
  // here rather than in migrateMasterChainParams.
  const premapped =
    raw.filter === undefined &&
    raw.highPass === undefined &&
    typeof raw.hiPass === "number"
      ? { ...raw, highPass: raw.hiPass }
      : raw;
  const knobs = migrateMasterChainParams(premapped);

  return {
    filter: frozenV1Curves.filterPosition(knobs.filter),
    saturation: frozenV1Curves.saturation(knobs.saturation),
    phaser: frozenV1Curves.phaser(knobs.phaser),
    reverb: frozenV1Curves.reverb(knobs.reverb),
    compThresholdDb: frozenV1Curves.compThresholdDb(knobs.compThreshold),
    compRatio: frozenV1Curves.compRatio(knobs.compRatio),
    compAttackSeconds: frozenV1Curves.compAttackSeconds(knobs.compAttack),
    compMix: frozenV1Curves.compMix(knobs.compMix),
    masterVolumeDb: frozenV1Curves.masterVolumeDb(knobs.masterVolume),
  };
}

function metaFromV1(meta: PresetFileV1["meta"]) {
  // Only id and name are schema-guaranteed strings; timestamps and author
  // pass through the tolerant v1 schema untyped.
  const raw = meta as unknown as Record<string, unknown> & {
    id: string;
    name: string;
  };
  return {
    id: raw.id,
    name: raw.name,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : V1_TIMESTAMP_SENTINEL,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : V1_TIMESTAMP_SENTINEL,
    ...(typeof raw.author === "string" ? { author: raw.author } : {}),
  };
}

// --- Migration --------------------------------------------------------------

/**
 * Migrate a validated v1 preset file to the v2 preset document.
 *
 * The playback derivation mirrors what use-preset-loading.ts does today, so
 * a migrated document matches what loading the same file produces.
 *
 * @throws {UnknownKitError} If the embedded kit's id does not resolve in the
 * registry (after legacy-id aliasing)
 * @throws {z.ZodError} If the migrated result violates presetDocumentSchema;
 * a migration bug should fail loudly, not emit garbage
 */
function migrateV1ToDocument(file: PresetFileV1): PresetDocument {
  const kitId = resolveKitId(file.kit);

  const legacyCycle = legacyCycleToChain(file.sequencer.variationCycle, 0);
  const chain = sanitizeChain(
    file.sequencer.chain ?? legacyCycle.chain ?? DEFAULT_CHAIN,
  );
  const chainEnabled =
    file.sequencer.chainEnabled ?? legacyCycle.chainEnabled ?? false;

  const channels = migrateInstruments(file.kit.instruments).map((instrument) =>
    channelFromKnobParams(instrument.params),
  );

  return presetDocumentSchema.parse({
    kind: PRESET_DOCUMENT_KIND,
    version: PRESET_DOCUMENT_VERSION,
    meta: metaFromV1(file.meta),
    kit: { id: kitId },
    channels,
    pattern: migratePattern(file.sequencer.pattern),
    playback: { chain, chainEnabled },
    transport: {
      bpm: file.transport.bpm,
      swing: frozenV1Curves.swingFraction(file.transport.swing),
    },
    master: masterFromV1(file.masterChain),
  });
}

export { frozenV1Curves, migrateV1ToDocument };
