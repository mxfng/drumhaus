import drumhausKitJson from "@/lib/kit/bin/drumhaus.dhkit";
import eightiesKitJson from "@/lib/kit/bin/eighties.dhkit";
import funkKitJson from "@/lib/kit/bin/funk.dhkit";
import indieKitJson from "@/lib/kit/bin/indie.dhkit";
import jungleKitJson from "@/lib/kit/bin/jungle.dhkit";
import organicKitJson from "@/lib/kit/bin/organic.dhkit";
import rnbKitJson from "@/lib/kit/bin/rnb.dhkit";
import techHouseKitJson from "@/lib/kit/bin/tech_house.dhkit";
import technoKitJson from "@/lib/kit/bin/techno.dhkit";
import trapKitJson from "@/lib/kit/bin/trap.dhkit";
import { validateKitFile } from "@/lib/kit/load";
import type { KitFileV1 } from "@/types/instrument";

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
