import aDrumCalledHausJson from "@/lib/preset/defaults/A Drum Called Haus.dh";
import amsterdamJson from "@/lib/preset/defaults/Amsterdam.dh";
import initJson from "@/lib/preset/defaults/init.dh";
import polaroidBounceJson from "@/lib/preset/defaults/Polaroid Bounce.dh";
import purpleHausJson from "@/lib/preset/defaults/Purple Haus.dh";
import richKidsJson from "@/lib/preset/defaults/Rich Kids.dh";
import slimeTimeJson from "@/lib/preset/defaults/Slime Time.dh";
import sunflowerJson from "@/lib/preset/defaults/Sunflower.dh";
import superDreamHausJson from "@/lib/preset/defaults/Super Dream Haus.dh";
import togetherAgainJson from "@/lib/preset/defaults/Together Again.dh";
import welcomeToTheHausJson from "@/lib/preset/defaults/Welcome to the Haus.dh";
import { validatePresetFile } from "@/lib/preset/helpers";
import type { PresetFileV1 } from "@/types/preset";

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
