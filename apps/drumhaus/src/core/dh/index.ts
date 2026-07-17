import {
  presetDocumentSchema,
  type PresetDocument,
} from "@/features/preset/document";
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
 * Factory preset loaders.
 *
 * The bundled `.dh` defaults are CURRENT-VERSION canonical documents
 * (docs/data-representation.md, PR E), so the app ships exactly what it writes.
 * Clone before parsing: the imported JSON modules are process-wide singletons,
 * and parse rebuilds the object so a loaded preset can never contaminate a
 * later call to the same loader.
 */
const loadDefault = (json: unknown): PresetDocument =>
  presetDocumentSchema.parse(structuredClone(json));

const aDrumCalledHaus = (): PresetDocument => loadDefault(aDrumCalledHausJson);
const amsterdam = (): PresetDocument => loadDefault(amsterdamJson);
const init = (): PresetDocument => loadDefault(initJson);
const polaroidBounce = (): PresetDocument => loadDefault(polaroidBounceJson);
const purpleHaus = (): PresetDocument => loadDefault(purpleHausJson);
const richKids = (): PresetDocument => loadDefault(richKidsJson);
const slimeTime = (): PresetDocument => loadDefault(slimeTimeJson);
const sunflower = (): PresetDocument => loadDefault(sunflowerJson);
const superDreamHaus = (): PresetDocument => loadDefault(superDreamHausJson);
const togetherAgain = (): PresetDocument => loadDefault(togetherAgainJson);
const welcomeToTheHaus = (): PresetDocument =>
  loadDefault(welcomeToTheHausJson);

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
