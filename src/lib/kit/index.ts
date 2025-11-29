import { KitFileV1 } from "@/features/instruments/types/instrument";
import drumhausKitJson from "@/lib/kit/defaults/drumhaus.dhkit";
import eightiesKitJson from "@/lib/kit/defaults/eighties.dhkit";
import funkKitJson from "@/lib/kit/defaults/funk.dhkit";
import indieKitJson from "@/lib/kit/defaults/indie.dhkit";
import jungleKitJson from "@/lib/kit/defaults/jungle.dhkit";
import organicKitJson from "@/lib/kit/defaults/organic.dhkit";
import rnbKitJson from "@/lib/kit/defaults/rnb.dhkit";
import techHouseKitJson from "@/lib/kit/defaults/tech_house.dhkit";
import technoKitJson from "@/lib/kit/defaults/techno.dhkit";
import trapKitJson from "@/lib/kit/defaults/trap.dhkit";
import { validateKitFile } from "@/lib/kit/helpers";

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
