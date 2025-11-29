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

export const aDrumCalledHaus = (): PresetFileV1 =>
  validatePresetFile(aDrumCalledHausJson);
export const amsterdam = (): PresetFileV1 => validatePresetFile(amsterdamJson);
export const init = (): PresetFileV1 => validatePresetFile(initJson);
export const polaroidBounce = (): PresetFileV1 =>
  validatePresetFile(polaroidBounceJson);
export const purpleHaus = (): PresetFileV1 =>
  validatePresetFile(purpleHausJson);
export const richKids = (): PresetFileV1 => validatePresetFile(richKidsJson);
export const slimeTime = (): PresetFileV1 => validatePresetFile(slimeTimeJson);
export const sunflower = (): PresetFileV1 => validatePresetFile(sunflowerJson);
export const superDreamHaus = (): PresetFileV1 =>
  validatePresetFile(superDreamHausJson);
export const togetherAgain = (): PresetFileV1 =>
  validatePresetFile(togetherAgainJson);
export const welcomeToTheHaus = (): PresetFileV1 =>
  validatePresetFile(welcomeToTheHausJson);
