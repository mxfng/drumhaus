import type { PresetFileV1 } from "@/features/preset/types/legacy-v1";
import { migrateLegacySwingKnob } from "./legacy-swing";
import { PRESET_FILE_VERSION, READABLE_V1_FILE_VERSIONS } from "./versions";

function isReadablePresetFileVersion(version: unknown): boolean {
  return (READABLE_V1_FILE_VERSIONS as readonly unknown[]).includes(version);
}

/**
 * Normalizes a readable preset file to the current version.
 *
 * v1 -> v1.5 rescales the swing knob value so the preset keeps the feel it
 * was saved with under the pre-#269 curve; every other field is untouched
 * (the shape is identical across the two versions). Idempotent: current
 * version presets pass through by reference.
 *
 * Every ingress must run this: file import and share URLs get it via
 * validatePresetFileV1, while presets stored verbatim in localStorage
 * (customPresets) get it in usePresetLoading.loadPreset.
 */
function migratePresetFileVersion(preset: PresetFileV1): PresetFileV1 {
  if (preset.version >= PRESET_FILE_VERSION) return preset;
  return {
    ...preset,
    version: PRESET_FILE_VERSION,
    transport: {
      ...preset.transport,
      swing: migrateLegacySwingKnob(preset.transport.swing),
    },
  };
}

export { isReadablePresetFileVersion, migratePresetFileVersion };
