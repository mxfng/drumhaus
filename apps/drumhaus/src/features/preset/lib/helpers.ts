import { getDefaultPresets } from "@/features/preset/lib/constants";
import type { PresetListItem } from "@/features/preset/types/preset";

/**
 * Check if a preset ID corresponds to a factory preset
 */
function isFactoryPreset(presetId: string): boolean {
  const defaultPresets = getDefaultPresets();
  return defaultPresets.some((p) => p.meta.id === presetId);
}

/**
 * Generate a unique duplicate name for a preset
 * Appends " Copy" or " Copy N" to avoid conflicts
 */
function generateDuplicateName(
  baseName: string,
  existingPresets: PresetListItem[],
): string {
  const nameSet = new Set(existingPresets.map((p) => p.meta.name));

  let newName = `${baseName} Copy`;
  let counter = 2;

  while (nameSet.has(newName)) {
    newName = `${baseName} Copy ${counter}`;
    counter++;
  }

  return newName;
}

export { isFactoryPreset, generateDuplicateName };
