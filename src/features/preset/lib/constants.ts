import * as presets from "@/core/dh/index";
import type { PresetDocument } from "@/features/preset/document";

/**
 * Maximum allowed length for preset names
 */
const MAX_PRESET_NAME_LENGTH = 20;

/**
 * All default presets included with the application, as canonical documents.
 * Lazy-loaded to avoid loading all preset data upfront.
 */
const getDefaultPresets = (): PresetDocument[] => [
  presets.init(),
  presets.welcomeToTheHaus(),
  presets.aDrumCalledHaus(),
  presets.amsterdam(),
  presets.polaroidBounce(),
  presets.purpleHaus(),
  presets.richKids(),
  presets.slimeTime(),
  presets.sunflower(),
  presets.superDreamHaus(),
  presets.togetherAgain(),
];

export { MAX_PRESET_NAME_LENGTH, getDefaultPresets };
