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

const aDrumCalledHaus = (): PresetFileV1 =>
  validatePresetFileV1(aDrumCalledHausJson);
const amsterdam = (): PresetFileV1 => validatePresetFileV1(amsterdamJson);
const init = (): PresetFileV1 => validatePresetFileV1(initJson);
const polaroidBounce = (): PresetFileV1 =>
  validatePresetFileV1(polaroidBounceJson);
const purpleHaus = (): PresetFileV1 => validatePresetFileV1(purpleHausJson);
const richKids = (): PresetFileV1 => validatePresetFileV1(richKidsJson);
const slimeTime = (): PresetFileV1 => validatePresetFileV1(slimeTimeJson);
const sunflower = (): PresetFileV1 => validatePresetFileV1(sunflowerJson);
const superDreamHaus = (): PresetFileV1 =>
  validatePresetFileV1(superDreamHausJson);
const togetherAgain = (): PresetFileV1 =>
  validatePresetFileV1(togetherAgainJson);
const welcomeToTheHaus = (): PresetFileV1 =>
  validatePresetFileV1(welcomeToTheHausJson);

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
