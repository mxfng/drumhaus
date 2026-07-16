import { z } from "zod";

import {
  INSTRUMENT_DECAY_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_TUNE_SEMITONE_RANGE,
  INSTRUMENT_VOLUME_RANGE,
} from "@/core/audio/engine/constants";
import type { KitFile } from "@/features/kit/types/kit";
import { AttributionStatus } from "@/features/kit/types/sample";
import { canonicalFilterSchema } from "@/features/preset/document/document";

/**
 * Zod schema for the kit registry file (`.dhkit`).
 *
 * Unlike the tolerant legacy `.dh` file schemas, the registry is bundled-only
 * and canonical (docs/data-representation.md, PR D): every `.dhkit` ships with
 * the app, holding CANONICAL instrument params (seconds, dB, -1..1 pan,
 * semitones, a `{ side, cutoffHz }` filter). So this is a strict schema whose
 * field bounds match the preset document's (constants below, and the shared
 * canonicalFilterSchema for the filter), giving kits the same load-time
 * validation the factory `.dh` defaults already get (core/dh/index.ts). A
 * malformed bundled kit is a ship-time bug that must fail loudly at module
 * load, not silently push out-of-range values into the engine.
 */

const inlineMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const kitMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.string().optional(),
});

const sampleAttributionSchema = z.object({
  status: z.enum(AttributionStatus),
  label: z.string().optional(),
  creditName: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

const sampleSchema = z.object({
  meta: inlineMetaSchema,
  path: z.string(),
  attribution: sampleAttributionSchema.optional(),
});

// Mirrors InstrumentParams (features/instrument/types/instrument.ts) in
// canonical units, bounded like the preset document's channelSchema. volume is
// a plain number (kits never persist the -Infinity/null "silence" spelling a
// preset channel can).
const instrumentParamsSchema = z.object({
  decay: z
    .number()
    .min(INSTRUMENT_DECAY_RANGE[0])
    .max(INSTRUMENT_DECAY_RANGE[1]),
  filter: canonicalFilterSchema,
  volume: z
    .number()
    .min(INSTRUMENT_VOLUME_RANGE[0])
    .max(INSTRUMENT_VOLUME_RANGE[1]),
  pan: z.number().min(INSTRUMENT_PAN_RANGE[0]).max(INSTRUMENT_PAN_RANGE[1]),
  tune: z
    .number()
    .min(-INSTRUMENT_TUNE_SEMITONE_RANGE)
    .max(INSTRUMENT_TUNE_SEMITONE_RANGE),
  solo: z.boolean(),
  mute: z.boolean(),
});

// The InstrumentRole union (core/audio/engine/instrument/types.ts). Kept as a
// literal list because the type has no runtime companion.
const instrumentRoleSchema = z.enum([
  "kick",
  "snare",
  "clap",
  "hat",
  "ohat",
  "tom",
  "perc",
  "crash",
  "bass",
  "synth",
  "other",
]);

const instrumentSchema = z.object({
  meta: inlineMetaSchema,
  role: instrumentRoleSchema,
  sample: sampleSchema,
  params: instrumentParamsSchema,
});

// Annotated to KitFile so the schema and the type cannot drift: a mismatch in
// either shape fails this assignment at compile time. validateKitFile returns
// the parsed result directly, so its output type stays KitFile.
const kitFileSchema: z.ZodType<KitFile> = z.object({
  kind: z.literal("drumhaus.kit"),
  meta: kitMetaSchema,
  instruments: z.array(instrumentSchema),
});

export { kitFileSchema };
