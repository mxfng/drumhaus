import { validateKitFile } from "@/features/kit/lib/helpers";
import { KitFileV1 } from "@/features/kit/types/kit";
import drumhausKitJson from "./defaults/drumhaus.dhkit";
import eightiesKitJson from "./defaults/eighties.dhkit";
import funkKitJson from "./defaults/funk.dhkit";
import indieKitJson from "./defaults/indie.dhkit";
import jungleKitJson from "./defaults/jungle.dhkit";
import organicKitJson from "./defaults/organic.dhkit";
import rnbKitJson from "./defaults/rnb.dhkit";
import techHouseKitJson from "./defaults/tech_house.dhkit";
import technoKitJson from "./defaults/techno.dhkit";
import trapKitJson from "./defaults/trap.dhkit";

/**
 * Kit loader functions
 * Each function returns a KitFileV1 object
 */

export const drumhaus = (): KitFileV1 => validateKitFile(drumhausKitJson);
export const organic = (): KitFileV1 => validateKitFile(organicKitJson);
export const funk = (): KitFileV1 => validateKitFile(funkKitJson);
export const rnb = (): KitFileV1 => validateKitFile(rnbKitJson);
export const trap = (): KitFileV1 => validateKitFile(trapKitJson);
export const eighties = (): KitFileV1 => validateKitFile(eightiesKitJson);
export const tech_house = (): KitFileV1 => validateKitFile(techHouseKitJson);
export const techno = (): KitFileV1 => validateKitFile(technoKitJson);
export const indie = (): KitFileV1 => validateKitFile(indieKitJson);
export const jungle = (): KitFileV1 => validateKitFile(jungleKitJson);
