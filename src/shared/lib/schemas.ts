import { z } from "zod";

// Validation schema for preset names
const presetNameSchema = z
  .string()
  .min(1, "Preset name is required")
  .max(20, "Preset name must be at most 20 characters")
  .refine(
    (name) => !/[/\\:*?"<>|]/.test(name),
    'Preset name contains invalid characters (/, \\, :, *, ?, ", <, >, |)',
  );

type PresetName = z.infer<typeof presetNameSchema>;

export { presetNameSchema };
export type { PresetName };
