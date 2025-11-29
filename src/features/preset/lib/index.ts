import aDrumCalledHausJson from "@/features/preset/lib/defaults/A Drum Called Haus.dh";
import amsterdamJson from "@/features/preset/lib/defaults/Amsterdam.dh";
import initJson from "@/features/preset/lib/defaults/init.dh";
import polaroidBounceJson from "@/features/preset/lib/defaults/Polaroid Bounce.dh";
import purpleHausJson from "@/features/preset/lib/defaults/Purple Haus.dh";
import richKidsJson from "@/features/preset/lib/defaults/Rich Kids.dh";
import slimeTimeJson from "@/features/preset/lib/defaults/Slime Time.dh";
import sunflowerJson from "@/features/preset/lib/defaults/Sunflower.dh";
import superDreamHausJson from "@/features/preset/lib/defaults/Super Dream Haus.dh";
import togetherAgainJson from "@/features/preset/lib/defaults/Together Again.dh";
import welcomeToTheHausJson from "@/features/preset/lib/defaults/Welcome to the Haus.dh";
import { validatePresetFile } from "@/features/preset/lib/helpers";
import type { PresetFileV1 } from "@/features/preset/types/preset";

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
