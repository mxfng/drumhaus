import type { PresetFileV1 } from "@/types/preset";
import * as presets from "./index";

/**
 * Maximum allowed length for preset names
 */
export const MAX_PRESET_NAME_LENGTH = 20;

/**
 * All default presets included with the application
 * Lazy-loaded to avoid loading all preset data upfront
 */
export const getDefaultPresets = (): PresetFileV1[] => [
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
