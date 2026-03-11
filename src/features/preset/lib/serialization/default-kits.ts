import {
  codeToKitId,
  getKitLoader,
  kitCount,
  kitIdToCode,
  loadKit,
} from "@/core/dhkit";
import { KitFileV1 } from "@/features/kit/types/kit";

// Re-export from central kit registry
export function kitIdToCompactCode(kitId: string): string | undefined {
  return kitIdToCode(kitId);
}

export function compactCodeToKitId(code: string): string | undefined {
  return codeToKitId(code);
}

export function getDefaultKitLoader(
  kitId: string,
): (() => KitFileV1) | undefined {
  return getKitLoader(kitId);
}

export function loadDefaultKit(kitId: string): KitFileV1 | undefined {
  return loadKit(kitId);
}

export const defaultKitCount = kitCount;
