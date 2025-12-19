import { validateKitFile } from "@/features/kit/lib/helpers";
import { KitFileV1 } from "@/features/kit/types/kit";
// Import all kit files
import kit0Json from "./defaults/808.dhkit";
import kit5Json from "./defaults/eighties.dhkit";
import kit7Json from "./defaults/fabriken.dhkit";
import kit2Json from "./defaults/funk.dhkit";
import kit8Json from "./defaults/indie.dhkit";
import kit9Json from "./defaults/jungle.dhkit";
import kit1Json from "./defaults/organic.dhkit";
import kit3Json from "./defaults/rnb.dhkit";
import kit6Json from "./defaults/tech_house.dhkit";
import kit4Json from "./defaults/trap.dhkit";

/**
 * Kit loaders indexed by stable ID (kit-0 through kit-9).
 * Display names can change freely; these indices are permanent.
 */
const KIT_LOADERS: Record<string, () => KitFileV1> = {
  "kit-0": () => validateKitFile(kit0Json),
  "kit-1": () => validateKitFile(kit1Json),
  "kit-2": () => validateKitFile(kit2Json),
  "kit-3": () => validateKitFile(kit3Json),
  "kit-4": () => validateKitFile(kit4Json),
  "kit-5": () => validateKitFile(kit5Json),
  "kit-6": () => validateKitFile(kit6Json),
  "kit-7": () => validateKitFile(kit7Json),
  "kit-8": () => validateKitFile(kit8Json),
  "kit-9": () => validateKitFile(kit9Json),
};

/**
 * Ordered list of kit IDs (determines UI order)
 */
const KIT_ORDER: string[] = [
  "kit-0",
  "kit-1",
  "kit-2",
  "kit-3",
  "kit-4",
  "kit-5",
  "kit-6",
  "kit-7",
  "kit-8",
  "kit-9",
];

/**
 * Get all available kits in display order
 */
export function getAllKits(): KitFileV1[] {
  return KIT_ORDER.map((id) => KIT_LOADERS[id]());
}

/**
 * Get a kit loader by its stable ID
 */
export function getKitLoader(id: string): (() => KitFileV1) | undefined {
  return KIT_LOADERS[id];
}

/**
 * Load a kit by its stable ID
 */
export function loadKit(id: string): KitFileV1 | undefined {
  const loader = KIT_LOADERS[id];
  return loader?.();
}

/**
 * Get the total number of default kits
 */
export const kitCount = KIT_ORDER.length;

/**
 * Convert kit ID to compact code for URL sharing (index in KIT_ORDER)
 */
export function kitIdToCode(kitId: string): string | undefined {
  const index = KIT_ORDER.indexOf(kitId);
  return index >= 0 ? String(index) : undefined;
}

/**
 * Convert compact code back to kit ID
 */
export function codeToKitId(code: string): string | undefined {
  const index = parseInt(code, 10);
  return index >= 0 && index < KIT_ORDER.length ? KIT_ORDER[index] : undefined;
}
