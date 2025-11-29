import drumhausKitJson from "@/features/kit/lib/defaults/drumhaus.dhkit";
import eightiesKitJson from "@/features/kit/lib/defaults/eighties.dhkit";
import funkKitJson from "@/features/kit/lib/defaults/funk.dhkit";
import indieKitJson from "@/features/kit/lib/defaults/indie.dhkit";
import jungleKitJson from "@/features/kit/lib/defaults/jungle.dhkit";
import organicKitJson from "@/features/kit/lib/defaults/organic.dhkit";
import rnbKitJson from "@/features/kit/lib/defaults/rnb.dhkit";
import techHouseKitJson from "@/features/kit/lib/defaults/tech_house.dhkit";
import technoKitJson from "@/features/kit/lib/defaults/techno.dhkit";
import trapKitJson from "@/features/kit/lib/defaults/trap.dhkit";
import { validateKitFile } from "@/features/kit/lib/helpers";
import { KitFileV1 } from "@/features/kit/types/kit";

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
