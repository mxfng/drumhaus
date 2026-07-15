import { encodePresetDocument } from "@/features/preset/document";
import { snapshotPresetDocument } from "@/features/preset/document/snapshot";
import type { Meta } from "@/features/preset/types/meta";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { MAX_PRESET_NAME_LENGTH } from "./constants";
import { getCurrentPreset } from "./helpers";

/**
 * Generate a shareable URL for a preset: the standard egress,
 * snapshot() -> encode. The payload is the v2 compact document encoding
 * (share links write version 2, decision 1).
 */
async function generateShareUrl(
  presetMeta: Meta,
  kitMeta: Meta,
  baseUrl: string = window.location.origin,
): Promise<string> {
  const normalizedName = normalizePresetName(presetMeta.name);
  const now = new Date().toISOString();
  const meta: Meta = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: now,
    updatedAt: now,
  };
  const document = snapshotPresetDocument(meta, kitMeta);

  const slug = toPresetSlug(normalizedName);

  // Avoid bundling compression unless needed
  const { shareableDocumentToUrl } =
    await import("@/features/preset/lib/serialization");
  const urlParam = shareableDocumentToUrl(document);

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
  const blob = createPresetExportBlob(preset.meta, preset.kit.meta);
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
 * Create a Blob for downloading the current store state as a .dh file:
 * the standard egress, snapshot() -> encode. The payload is the v2 document
 * encoding: exports write version 2 (decision 1).
 */
function createPresetExportBlob(presetMeta: Meta, kitMeta: Meta): Blob {
  const json = encodePresetDocument(
    snapshotPresetDocument(presetMeta, kitMeta),
  );
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
  generateShareUrl,
  createPresetForExport,
  createPresetExportBlob,
  downloadPreset,
};
