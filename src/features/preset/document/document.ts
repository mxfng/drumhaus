/**
 * The v2 preset document model.
 *
 * A `.dh` file, version 2: a domain-space (dB, seconds, semitones, -1..1
 * pan) description of a preset, decoupled from 0-100 knob positions except
 * for split-filter positions, whose 0-100 position IS the domain value.
 * The zod schema is the single source of truth; the PresetDocument type is
 * inferred from it. No production code consumes this yet.
 */

import { z } from "zod";

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
  TRANSPORT_SWING_MAX,
} from "@/core/audio/engine/constants";
import {
  MAX_CHAIN_REPEAT,
  MAX_CHAIN_STEPS,
  MIN_CHAIN_REPEAT,
  type Pattern,
} from "@/core/audio/engine/pattern-types";

const PRESET_DOCUMENT_KIND = "drumhaus.preset";
const PRESET_DOCUMENT_VERSION = 2;

const CHANNEL_COUNT = 8;

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
  // Split-filter position 0-100 (LP side 0-49, HP side 50-100); semantics
  // in engine/fx/split-filter.ts.
  filter: z.number().min(0).max(100),
  // null is the JSON-safe spelling of -Infinity (knob 0 = silence).
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
  bpm: z.number().positive(),
  swing: z.number().min(0).max(TRANSPORT_SWING_MAX),
});

const masterSchema = z.object({
  // Split-filter position 0-100, same semantics as the channel filter.
  filter: z.number().min(0).max(100),
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
  // null is the JSON-safe spelling of -Infinity (knob 0 = silence).
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

const presetDocumentSchema = z.object({
  kind: z.literal(PRESET_DOCUMENT_KIND),
  version: z.literal(PRESET_DOCUMENT_VERSION),
  meta: metaSchema,
  kit: z.object({ id: z.string() }),
  channels: channelsSchema,
  pattern: patternSchema,
  playback: playbackSchema,
  transport: transportSchema,
  master: masterSchema,
});

type PresetDocument = z.infer<typeof presetDocumentSchema>;

export { PRESET_DOCUMENT_KIND, PRESET_DOCUMENT_VERSION, presetDocumentSchema };
export type { PresetDocument };
