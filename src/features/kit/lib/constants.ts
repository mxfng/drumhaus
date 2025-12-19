import * as kits from "../../../core/dhkit/index";
import { KitFileV1 } from "../types/kit";

/**
 * All available kits in the application
 * Lazy-loaded to avoid loading all samples upfront
 */
export const getAllKits = (): KitFileV1[] => [
  kits.eightOhEight(),
  kits.organic(),
  kits.funk(),
  kits.rnb(),
  kits.trap(),
  kits.eighties(),
  kits.tech_house(),
  kits.fabriken(),
  kits.indie(),
  kits.jungle(),
];
