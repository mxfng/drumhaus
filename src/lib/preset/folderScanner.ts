/**
 * Utility to scan a directory for preset files (.dh)
 */

import type { PresetFileV1 } from "@/types/preset";
import { validatePresetFile } from "./helpers";

export interface ScannedPreset {
  preset: PresetFileV1;
  fileHandle: FileSystemFileHandle;
  fileName: string;
}

export interface ScanResult {
  presets: ScannedPreset[];
  errors: Array<{ fileName: string; error: string }>;
}

/**
 * Scan a directory for .dh preset files
 * Returns validated presets and any errors encountered
 */
export async function scanPresetFolder(
  directoryHandle: FileSystemDirectoryHandle,
): Promise<ScanResult> {
  const presets: ScannedPreset[] = [];
  const errors: Array<{ fileName: string; error: string }> = [];

  try {
    for await (const entry of directoryHandle.values()) {
      // Only process .dh files
      if (entry.kind !== "file" || !entry.name.endsWith(".dh")) {
        continue;
      }

      try {
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const content = await file.text();
        const data = JSON.parse(content);
        const preset = validatePresetFile(data);

        presets.push({
          preset,
          fileHandle,
          fileName: entry.name,
        });
      } catch (err) {
        errors.push({
          fileName: entry.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  } catch (err) {
    errors.push({
      fileName: "(directory)",
      error: err instanceof Error ? err.message : "Failed to read directory",
    });
  }

  // Sort presets by name for consistent ordering
  presets.sort((a, b) => a.preset.meta.name.localeCompare(b.preset.meta.name));

  return { presets, errors };
}

/**
 * Save a preset to a directory
 * Creates a new file or overwrites existing one
 */
export async function savePresetToFolder(
  directoryHandle: FileSystemDirectoryHandle,
  preset: PresetFileV1,
  fileName?: string,
): Promise<FileSystemFileHandle> {
  // Generate filename from preset name if not provided
  const safeName = fileName || `${sanitizeFileName(preset.meta.name)}.dh`;

  const fileHandle = await directoryHandle.getFileHandle(safeName, {
    create: true,
  });

  const writable = await fileHandle.createWritable();
  const json = JSON.stringify(preset, null, 2);
  await writable.write(json);
  await writable.close();

  return fileHandle;
}

/**
 * Overwrite an existing preset file
 */
export async function updatePresetFile(
  fileHandle: FileSystemFileHandle,
  preset: PresetFileV1,
): Promise<void> {
  const writable = await fileHandle.createWritable();
  const json = JSON.stringify(preset, null, 2);
  await writable.write(json);
  await writable.close();
}

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 100); // Limit length
}
