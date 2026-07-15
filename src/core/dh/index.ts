import { validatePresetFileV1 } from "@/features/preset/document";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import aDrumCalledHausJson from "./defaults/A Drum Called Haus.dh";
import amsterdamJson from "./defaults/Amsterdam.dh";
import initJson from "./defaults/init.dh";
import polaroidBounceJson from "./defaults/Polaroid Bounce.dh";
import purpleHausJson from "./defaults/Purple Haus.dh";
import richKidsJson from "./defaults/Rich Kids.dh";
import slimeTimeJson from "./defaults/Slime Time.dh";
import sunflowerJson from "./defaults/Sunflower.dh";
import superDreamHausJson from "./defaults/Super Dream Haus.dh";
import togetherAgainJson from "./defaults/Together Again.dh";
import welcomeToTheHausJson from "./defaults/Welcome to the Haus.dh";

/**
 * Preset loader functions
 * Each function returns a PresetFileV1 object
 */

// Clone before validating: the tolerant v1 schema passes nested sections
// (pattern, params) through by reference, and the imported JSON modules are
// process-wide singletons - without the clone, mutating a loaded preset
// would contaminate every later call to the same loader.
const loadDefault = (json: unknown): PresetFileV1 =>
  validatePresetFileV1(structuredClone(json));

const aDrumCalledHaus = (): PresetFileV1 => loadDefault(aDrumCalledHausJson);
const amsterdam = (): PresetFileV1 => loadDefault(amsterdamJson);
const init = (): PresetFileV1 => loadDefault(initJson);
const polaroidBounce = (): PresetFileV1 => loadDefault(polaroidBounceJson);
const purpleHaus = (): PresetFileV1 => loadDefault(purpleHausJson);
const richKids = (): PresetFileV1 => loadDefault(richKidsJson);
const slimeTime = (): PresetFileV1 => loadDefault(slimeTimeJson);
const sunflower = (): PresetFileV1 => loadDefault(sunflowerJson);
const superDreamHaus = (): PresetFileV1 => loadDefault(superDreamHausJson);
const togetherAgain = (): PresetFileV1 => loadDefault(togetherAgainJson);
const welcomeToTheHaus = (): PresetFileV1 => loadDefault(welcomeToTheHausJson);

export {
  aDrumCalledHaus,
  amsterdam,
  init,
  polaroidBounce,
  purpleHaus,
  richKids,
  slimeTime,
  sunflower,
  superDreamHaus,
  togetherAgain,
  welcomeToTheHaus,
};
