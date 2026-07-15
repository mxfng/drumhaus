import { z } from "zod";

/**
 * Zod schemas for the v1 .dh preset file format.
 *
 * Deliberately tolerant: these schemas must accept every legacy shape the
 * runtime migrators (src/features/sequencer/lib/migrations.ts) accept, so
 * value-level coercion stays in the migrators and the schema only rejects
 * inputs that would crash loadPreset today. Tightening a field here is a
 * behavior change and needs a fixture proving no in-the-wild file relied
 * on the old leniency.
 */

// migrateInstrumentParams and migrateMasterChainParams only gate on
// typeof === "object" and default every wrong-typed value, so a stricter
// z.object()/z.record() (which rejects arrays, for one) would be a
// behavior change. Values stay entirely loose at this layer.
const looseObjectValue = z.custom<Record<string, unknown>>(
  (value) => typeof value === "object" && value !== null,
  { message: "expected an object" },
);

// Only id and name are dereferenced on the load path (preset lookup,
// toasts); timestamps and author are carried along untouched.
const metaSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
  author: z.unknown().optional(),
});

// Nested unknown keys inside instruments pass through untouched (loose
// objects); only envelope/section-level unknowns are stripped.
const instrumentSchema = z.looseObject({
  role: z.string(),
  sample: z.looseObject({
    path: z.string(),
  }),
  params: looseObjectValue,
});

// The kit's own kind/version/meta were never validated by the old shallow
// gate and nothing on the load path requires them; only instruments is
// dereferenced during load.
const kitSchema = z.object({
  kind: z.unknown().optional(),
  version: z.unknown().optional(),
  meta: z.unknown().optional(),
  instruments: z.array(instrumentSchema),
});

// loadPreset passes bpm/swing straight to setBpm/setSwing.
const transportSchema = z.object({
  bpm: z.number(),
  swing: z.number(),
});

// Accepts both the legacy Voice[] shape and the modern { voices } object;
// migratePattern normalizes the contents, so voice internals stay unknown.
const patternSchema = z.unknown().superRefine((value, ctx) => {
  if (Array.isArray(value)) return;
  if (typeof value === "object" && value !== null) {
    if (Array.isArray((value as Record<string, unknown>).voices)) return;
    ctx.addIssue({
      code: "custom",
      path: ["voices"],
      message: "expected an array of voices",
    });
    return;
  }
  ctx.addIssue({
    code: "custom",
    message: "expected a voice array or an object with a voices array",
  });
});

// chain/chainEnabled/variationCycle are all defaulted by loadPreset and
// sanitized downstream (sanitizeChain, legacyCycleToChain), so they stay
// loose here.
const sequencerSchema = z.object({
  pattern: patternSchema,
  chain: z.unknown().optional(),
  chainEnabled: z.unknown().optional(),
  variationCycle: z.unknown().optional(),
});

const presetFileV1Schema = z.object({
  kind: z.literal("drumhaus.preset"),
  version: z.literal(1),
  meta: metaSchema,
  kit: kitSchema,
  transport: transportSchema,
  sequencer: sequencerSchema,
  // Values loose: migrateMasterChainParams handles legacy lowPass/highPass
  // and defaults wrong-typed fields.
  masterChain: looseObjectValue,
});

type PresetFileV1Parsed = z.infer<typeof presetFileV1Schema>;

/**
 * Lists the key paths that z.object stripping will drop from a raw preset,
 * at the envelope and section level only. masterChain keys are data, not
 * schema keys, and are never stripped; instrument/pattern internals pass
 * through loose objects untouched.
 */
function collectStrippedKeyPaths(raw: Record<string, unknown>): string[] {
  const stripped: string[] = [];

  const check = (value: unknown, prefix: string, known: string[]) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return;
    }
    for (const key of Object.keys(value)) {
      if (!known.includes(key)) {
        stripped.push(prefix ? `${prefix}.${key}` : key);
      }
    }
  };

  check(raw, "", Object.keys(presetFileV1Schema.shape));
  check(raw.meta, "meta", Object.keys(metaSchema.shape));
  check(raw.kit, "kit", Object.keys(kitSchema.shape));
  check(raw.transport, "transport", Object.keys(transportSchema.shape));
  check(raw.sequencer, "sequencer", Object.keys(sequencerSchema.shape));

  return stripped;
}

export { presetFileV1Schema, collectStrippedKeyPaths };
export type { PresetFileV1Parsed };
