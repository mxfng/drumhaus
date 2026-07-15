import type { PresetFileV1 } from "@/features/preset/types/preset";
import { migrateLegacySwingKnob } from "@/features/transport/lib/legacy-swing";

/**
 * Current version of the knob-space .dh preset file format.
 *
 * v1 and v1.5 share the exact same shape; the bump marks the #269 swing
 * retune, which reinterpreted the persisted 0-100 swing knob value (old
 * curve: Tone swing = knob / 200; new curve: knob * 0.00375). The bump is
 * fractional so version 2 stays reserved for the domain-unit preset document
 * (docs/preset-persistence.md, src/features/preset/document/document.ts).
 */
const PRESET_FILE_VERSION = 1.5;

function isReadablePresetFileVersion(version: unknown): boolean {
  return version === 1 || version === PRESET_FILE_VERSION;
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

export {
  PRESET_FILE_VERSION,
  isReadablePresetFileVersion,
  migratePresetFileVersion,
};
