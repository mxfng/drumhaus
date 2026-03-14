import {
  codeToKitId,
  getKitLoader,
  kitCount,
  kitIdToCode,
  loadKit,
} from "@/core/dhkit";
import { KitFileV1 } from "@/features/kit/types/kit";

// Re-export from central kit registry
function kitIdToCompactCode(kitId: string): string | undefined {
  return kitIdToCode(kitId);
}

function compactCodeToKitId(code: string): string | undefined {
  return codeToKitId(code);
}

function getDefaultKitLoader(kitId: string): (() => KitFileV1) | undefined {
  return getKitLoader(kitId);
}

function loadDefaultKit(kitId: string): KitFileV1 | undefined {
  return loadKit(kitId);
}

const defaultKitCount = kitCount;

export {
  kitIdToCompactCode,
  compactCodeToKitId,
  getDefaultKitLoader,
  loadDefaultKit,
  defaultKitCount,
};
