import { z } from "zod";

// Validation schema for preset names
export const presetNameSchema = z
  .string()
  .min(1, "Preset name is required")
  .max(20, "Preset name must be at most 20 characters")
  .refine(
    (name) => !/[/\\:*?"<>|]/.test(name),
    'Preset name contains invalid characters (/, \\, :, *, ?, ", <, >, |)',
  );

export type PresetName = z.infer<typeof presetNameSchema>;
