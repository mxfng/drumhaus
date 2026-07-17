import {
  codeToKitId,
  getKitLoader,
  kitCount,
  kitIdToCode,
  loadKit,
} from "@/core/dhkit";
import { KitFile } from "@/features/kit/types/kit";

// Re-export from central kit registry
function kitIdToCompactCode(kitId: string): string | undefined {
  return kitIdToCode(kitId);
}

function compactCodeToKitId(code: string): string | undefined {
  return codeToKitId(code);
}

function getDefaultKitLoader(kitId: string): (() => KitFile) | undefined {
  return getKitLoader(kitId);
}

function loadDefaultKit(kitId: string): KitFile | undefined {
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
