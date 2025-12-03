import type { Meta } from "@/features/preset/types/meta";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { MAX_PRESET_NAME_LENGTH } from "./constants";
import { getCurrentPreset, validatePresetFile } from "./helpers";

/**
 * Parse and validate a preset from a JSON string
 * Throws an error if the preset is invalid
 */
export function parsePresetFile(jsonString: string): PresetFileV1 {
  const parsed = JSON.parse(jsonString);
  return validatePresetFile(parsed);
}

/**
 * Generate a shareable URL for a preset
 * Creates a new preset with generated metadata and encodes it
 */
export async function generateShareUrl(
  presetMeta: Meta,
  kitMeta: Meta,
  baseUrl: string = window.location.origin,
): Promise<string> {
  const preset = createPresetForExport(presetMeta.name, kitMeta);
  const normalizedName = preset.meta.name;

  const slug = toPresetSlug(normalizedName);

  // Avoid bundling compression unless needed
  const { shareablePresetToUrl } =
    await import("@/features/preset/lib/serialization");
  const urlParam = shareablePresetToUrl(preset);

  return `${baseUrl}/?p=${urlParam}&n=${encodeURIComponent(slug)}`;
}

/**
 * Create a preset export with metadata for saving
 */
export function createPresetForExport(
  name: string,
  kitMeta: Meta,
): PresetFileV1 {
  const normalizedName = normalizePresetName(name);

  const now = new Date().toISOString();
  const meta: Meta = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: now,
    updatedAt: now,
  };

  return getCurrentPreset(meta, kitMeta);
}

/**
 * Download a preset as a .dh file
 */
export function downloadPreset(preset: PresetFileV1, name: string): void {
  const blob = createPresetExportBlob(preset);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${normalizePresetName(name)}.dh`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- Helper Functions ---

/**
 * Normalize a preset name by trimming and limiting length
 * Falls back to "Untitled" if empty after processing
 */
function normalizePresetName(name: string): string {
  const trimmed = name.trim();
  const limited = trimmed.slice(0, MAX_PRESET_NAME_LENGTH);
  return limited || "Untitled";
}

/**
 * Create a Blob for downloading a preset as a .dh file
 */
function createPresetExportBlob(preset: PresetFileV1): Blob {
  const json = JSON.stringify(preset, null, 2);
  // Use a generic binary MIME type so iOS Safari doesn't append ".json"
  // to the downloaded ".dh" file name.
  return new Blob([json], { type: "application/octet-stream" });
}

/**
 * Convert a preset name to a URL-safe slug
 * Used for generating shareable URLs
 */
function toPresetSlug(name: string): string {
  const base = normalizePresetName(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || "preset";
}
