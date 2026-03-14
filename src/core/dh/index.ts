import { validatePresetFile } from "@/features/preset/lib/helpers";
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

const aDrumCalledHaus = (): PresetFileV1 =>
  validatePresetFile(aDrumCalledHausJson);
const amsterdam = (): PresetFileV1 => validatePresetFile(amsterdamJson);
const init = (): PresetFileV1 => validatePresetFile(initJson);
const polaroidBounce = (): PresetFileV1 =>
  validatePresetFile(polaroidBounceJson);
const purpleHaus = (): PresetFileV1 => validatePresetFile(purpleHausJson);
const richKids = (): PresetFileV1 => validatePresetFile(richKidsJson);
const slimeTime = (): PresetFileV1 => validatePresetFile(slimeTimeJson);
const sunflower = (): PresetFileV1 => validatePresetFile(sunflowerJson);
const superDreamHaus = (): PresetFileV1 =>
  validatePresetFile(superDreamHausJson);
const togetherAgain = (): PresetFileV1 => validatePresetFile(togetherAgainJson);
const welcomeToTheHaus = (): PresetFileV1 =>
  validatePresetFile(welcomeToTheHausJson);

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
