/**
 * The domain-unit preset document model (docs/preset-persistence.md).
 *
 * A `.dh` file, version 2.1: a domain-space (dB, seconds, semitones, -1..1
 * pan) description of a preset, fully decoupled from 0-100 knob positions.
 * The zod schema is the single source of truth; the PresetDocument type is
 * inferred from it.
 *
 * Version history:
 * - 1 / 1.5: the knob-space `.dh` file shape (legacy-file-version.ts); 1.5
 *   marks the #269 swing retune.
 * - 2: the first domain document; every field domain-space EXCEPT the split
 *   filter, which was still persisted as its 0-100 position.
 * - 2.1 (this version): a refinement of the v2 domain document - the split
 *   filter becomes canonical `{ side, cutoffHz }`
 *   (docs/data-representation.md, Principle P2); every other field is
 *   unchanged. The fractional minor signals "refinement, not a new
 *   generation", mirroring the #269 swing retune's `.dh` v1.5. Version-2
 *   documents in the wild migrate on read via migrate-v2.ts (position ->
 *   canonical, frozen curve).
 */

import { z } from "zod";

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import {
  INSTRUMENT_DECAY_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_TUNE_SEMITONE_RANGE,
  INSTRUMENT_VOLUME_RANGE,
  MASTER_COMP_ATTACK_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_VOLUME_RANGE,
  STEP_COUNT,
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_MAX,
} from "@/core/audio/engine/constants";
import {
  MAX_CHAIN_REPEAT,
  MAX_CHAIN_STEPS,
  MIN_CHAIN_REPEAT,
  type Pattern,
} from "@/core/audio/engine/pattern-types";
import { SPLIT_FILTER_MAX_CUTOFF_HZ } from "./frozen-split-filter";
import { collectStrippedKeyPaths, type StrippedSection } from "./stripped-keys";

const PRESET_DOCUMENT_KIND = "drumhaus.preset";
/**
 * Current preset document version. Fractional minor (2.1) marks a refinement
 * of the v2 domain document - the canonical split filter - not a new
 * generation, mirroring the `.dh` file's v1.5 (legacy-file-version.ts).
 * Everything that dispatches on this value must treat versions as
 * fractional, never integer-only.
 */
const PRESET_DOCUMENT_VERSION = 2.1;

const CHANNEL_COUNT = 8;

/**
 * Upper bound on a canonical filter cutoff: the frozen curve's HP-side
 * overshoot (SPLIT_FILTER_MAX_CUTOFF_HZ ~= 15618.5 Hz, the position-100 closed
 * high-pass extreme). Traceable to the frozen curve rather than a round magic
 * number, so the schema accepts every value the curve can legitimately produce
 * and rejects anything above it.
 */
const FILTER_MAX_CUTOFF_HZ = SPLIT_FILTER_MAX_CUTOFF_HZ;

/**
 * Canonical split filter (docs/data-representation.md, Principle P2): the
 * side the filter is on and the active side's cutoff in Hz. The annotation
 * pins the schema to the shared CanonicalFilter type so the two cannot drift.
 */
const canonicalFilterSchema: z.ZodType<CanonicalFilter> = z.object({
  side: z.union([z.literal("lowpass"), z.literal("highpass")]),
  cutoffHz: z.number().min(0).max(FILTER_MAX_CUTOFF_HZ),
});

// --- Pattern (mirrors the engine's Pattern type; arities enforced here) ---

const timingNudgeSchema = z.union([
  z.literal(-2),
  z.literal(-1),
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);

const stepFlagsSchema = z.array(z.boolean()).length(STEP_COUNT);

const stepSequenceSchema = z.object({
  triggers: stepFlagsSchema,
  velocities: z.array(z.number().min(0).max(1)).length(STEP_COUNT),
  timingNudge: timingNudgeSchema,
  ratchets: stepFlagsSchema,
  flams: stepFlagsSchema,
});

const voiceSchema = z.object({
  instrumentIndex: z
    .number()
    .int()
    .min(0)
    .max(CHANNEL_COUNT - 1),
  variations: z.tuple([
    stepSequenceSchema,
    stepSequenceSchema,
    stepSequenceSchema,
    stepSequenceSchema,
  ]),
});

const variationMetadataSchema = z.object({
  accent: stepFlagsSchema,
});

// The annotation pins the schema to the engine's Pattern type at compile
// time, so the two cannot drift apart silently.
const patternSchema: z.ZodType<Pattern> = z.object({
  voices: z.array(voiceSchema).length(CHANNEL_COUNT),
  variationMetadata: z.tuple([
    variationMetadataSchema,
    variationMetadataSchema,
    variationMetadataSchema,
    variationMetadataSchema,
  ]),
});

// --- Channels ---

const channelSchema = z.object({
  decaySeconds: z
    .number()
    .min(INSTRUMENT_DECAY_RANGE[0])
    .max(INSTRUMENT_DECAY_RANGE[1]),
  // Canonical split filter `{ side, cutoffHz }`.
  filter: canonicalFilterSchema,
  // null is the JSON-safe spelling of -Infinity (silence).
  volumeDb: z
    .number()
    .min(INSTRUMENT_VOLUME_RANGE[0])
    .max(INSTRUMENT_VOLUME_RANGE[1])
    .nullable(),
  pan: z.number().min(INSTRUMENT_PAN_RANGE[0]).max(INSTRUMENT_PAN_RANGE[1]),
  tuneSemitones: z
    .number()
    .min(-INSTRUMENT_TUNE_SEMITONE_RANGE)
    .max(INSTRUMENT_TUNE_SEMITONE_RANGE),
  mute: z.boolean(),
  solo: z.boolean(),
});

const channelsSchema = z.tuple([
  channelSchema,
  channelSchema,
  channelSchema,
  channelSchema,
  channelSchema,
  channelSchema,
  channelSchema,
  channelSchema,
]);

// --- Playback / transport / master ---

const chainStepSchema = z.object({
  variation: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  repeats: z.number().int().min(MIN_CHAIN_REPEAT).max(MAX_CHAIN_REPEAT),
});

const playbackSchema = z.object({
  chain: z.object({
    steps: z.array(chainStepSchema).max(MAX_CHAIN_STEPS),
  }),
  chainEnabled: z.boolean(),
});

const transportSchema = z.object({
  bpm: z.number().min(TRANSPORT_BPM_RANGE[0]).max(TRANSPORT_BPM_RANGE[1]),
  swing: z.number().min(0).max(TRANSPORT_SWING_MAX),
});

const masterSchema = z.object({
  // Canonical split filter `{ side, cutoffHz }`, same shape as the channel filter.
  filter: canonicalFilterSchema,
  saturation: z.number().min(0).max(1),
  phaser: z.number().min(0).max(1),
  reverb: z.number().min(0).max(1),
  compThresholdDb: z
    .number()
    .min(MASTER_COMP_THRESHOLD_RANGE[0])
    .max(MASTER_COMP_THRESHOLD_RANGE[1]),
  compRatio: z
    .number()
    .int()
    .min(MASTER_COMP_RATIO_RANGE[0])
    .max(MASTER_COMP_RATIO_RANGE[1]),
  compAttackSeconds: z
    .number()
    .min(MASTER_COMP_ATTACK_RANGE[0])
    .max(MASTER_COMP_ATTACK_RANGE[1]),
  compMix: z.number().min(0).max(1),
  // null is the JSON-safe spelling of -Infinity (silence).
  masterVolumeDb: z
    .number()
    .min(MASTER_VOLUME_RANGE[0])
    .max(MASTER_VOLUME_RANGE[1])
    .nullable(),
});

// --- Envelope ---

const metaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.string().optional(),
});

// The registry reference that survives a preset; the embedded kit copy is
// dropped on read (decision 12). Named so the strip walker can read its shape.
const kitReferenceSchema = z.object({ id: z.string() });

const presetDocumentSchema = z.object({
  kind: z.literal(PRESET_DOCUMENT_KIND),
  version: z.literal(PRESET_DOCUMENT_VERSION),
  meta: metaSchema,
  kit: kitReferenceSchema,
  channels: channelsSchema,
  pattern: patternSchema,
  playback: playbackSchema,
  transport: transportSchema,
  master: masterSchema,
});

type PresetDocument = z.infer<typeof presetDocumentSchema>;

/**
 * The key paths a strict presetDocumentSchema parse silently strips from a raw
 * document (docs/preset-persistence.md, decision 3: strip at load with a
 * warning). Mirrors the v1 reader's collectStrippedKeyPaths in scope: the
 * envelope, each object section, and each channel are inspected one level deep;
 * the pattern's nested tuples are left to the strict parse to reject. Callers
 * warn on the result via warnStrippedKeyPaths.
 */
function collectDocumentStrippedKeyPaths(raw: unknown): string[] {
  if (typeof raw !== "object" || raw === null) return [];
  const doc = raw as Record<string, unknown>;
  const channelKeys = Object.keys(channelSchema.shape);
  const channelSections: StrippedSection[] = Array.isArray(doc.channels)
    ? doc.channels.map((channel, index) => ({
        value: channel,
        prefix: `channels.${index}`,
        knownKeys: channelKeys,
      }))
    : [];
  return collectStrippedKeyPaths([
    {
      value: doc,
      prefix: "",
      knownKeys: Object.keys(presetDocumentSchema.shape),
    },
    {
      value: doc.meta,
      prefix: "meta",
      knownKeys: Object.keys(metaSchema.shape),
    },
    {
      value: doc.kit,
      prefix: "kit",
      knownKeys: Object.keys(kitReferenceSchema.shape),
    },
    {
      value: doc.transport,
      prefix: "transport",
      knownKeys: Object.keys(transportSchema.shape),
    },
    {
      value: doc.playback,
      prefix: "playback",
      knownKeys: Object.keys(playbackSchema.shape),
    },
    {
      value: doc.master,
      prefix: "master",
      knownKeys: Object.keys(masterSchema.shape),
    },
    ...channelSections,
  ]);
}

export {
  PRESET_DOCUMENT_KIND,
  PRESET_DOCUMENT_VERSION,
  canonicalFilterSchema,
  collectDocumentStrippedKeyPaths,
  presetDocumentSchema,
};
export type { PresetDocument };
