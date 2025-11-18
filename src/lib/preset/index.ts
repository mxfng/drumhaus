import aDrumCalledHausJson from "@/lib/preset/bin/A Drum Called Haus.dh";
import amsterdamJson from "@/lib/preset/bin/Amsterdam.dh";
import initJson from "@/lib/preset/bin/init.dh";
import polaroidBounceJson from "@/lib/preset/bin/Polaroid Bounce.dh";
import purpleHausJson from "@/lib/preset/bin/Purple Haus.dh";
import richKidsJson from "@/lib/preset/bin/Rich Kids.dh";
import slimeTimeJson from "@/lib/preset/bin/Slime Time.dh";
import sunflowerJson from "@/lib/preset/bin/Sunflower.dh";
import superDreamHausJson from "@/lib/preset/bin/Super Dream Haus.dh";
import togetherAgainJson from "@/lib/preset/bin/Together Again.dh";
import welcomeToTheHausJson from "@/lib/preset/bin/Welcome to the Haus.dh";
import { validatePresetFile } from "@/lib/preset/load";
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
