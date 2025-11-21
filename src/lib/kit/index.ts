import drumhausKitJson from "@/lib/kit/defaults/Drumhaus.dhkit";
import eightiesKitJson from "@/lib/kit/defaults/Eighties.dhkit";
import funkKitJson from "@/lib/kit/defaults/Funk.dhkit";
import indieKitJson from "@/lib/kit/defaults/Indie.dhkit";
import jungleKitJson from "@/lib/kit/defaults/Jungle.dhkit";
import organicKitJson from "@/lib/kit/defaults/Organic.dhkit";
import rnbKitJson from "@/lib/kit/defaults/R&B.dhkit";
import techHouseKitJson from "@/lib/kit/defaults/Tech House.dhkit";
import technoKitJson from "@/lib/kit/defaults/Techno.dhkit";
import trapKitJson from "@/lib/kit/defaults/Trap.dhkit";
import { validateKitFile } from "@/lib/kit/helpers";
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
