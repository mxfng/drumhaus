import {
  decodePresetFileText,
  documentToV1,
  encodePresetDocument,
  migrateV1ToDocument,
  parsePresetFileV1,
  PRESET_DOCUMENT_VERSION,
} from "@/features/preset/document";
import type { Meta } from "@/features/preset/types/meta";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { MAX_PRESET_NAME_LENGTH } from "./constants";
import { getCurrentPreset } from "./helpers";

/**
 * Parse and validate a preset from a JSON string, dual-reading both file
 * versions: v2 documents are decoded and adapted to the v1 shape today's
 * loadPreset consumes, while v1 files keep flowing through the legacy parse
 * path untouched (the heuristic migrators inside loadPreset still normalize
 * them, exactly as before).
 * Throws a typed PresetDocumentError if the preset is invalid.
 */
function parsePresetFile(jsonString: string): PresetFileV1 {
  if (peekPresetVersion(jsonString) === PRESET_DOCUMENT_VERSION) {
    return documentToV1(decodePresetFileText(jsonString));
  }
  return parsePresetFileV1(jsonString);
}

/**
 * Best-effort version peek for dispatch only; malformed text falls through
 * to the legacy parser, which raises the same typed errors it always has.
 */
function peekPresetVersion(jsonString: string): unknown {
  try {
    const data: unknown = JSON.parse(jsonString);
    return typeof data === "object" && data !== null
      ? (data as { version?: unknown }).version
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Generate a shareable URL for a preset
 * Creates a new preset with generated metadata and encodes it
 */
async function generateShareUrl(
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
function createPresetForExport(name: string, kitMeta: Meta): PresetFileV1 {
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
function downloadPreset(preset: PresetFileV1, name: string): void {
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
 * Create a Blob for downloading a preset as a .dh file.
 * The payload is the v2 document encoding: exports write version 2
 * (decision 1), migrated from the store-shaped v1 snapshot.
 */
function createPresetExportBlob(preset: PresetFileV1): Blob {
  const json = encodePresetDocument(migrateV1ToDocument(preset));
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

export {
  parsePresetFile,
  generateShareUrl,
  createPresetForExport,
  createPresetExportBlob,
  downloadPreset,
};
