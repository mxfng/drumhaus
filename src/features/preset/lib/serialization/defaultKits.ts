import * as kitLoaders from "@/core/dhkit";
import { KitFileV1 } from "@/features/kit/types/kit";

type DefaultKitDefinition = {
  id: string;
  loader: () => KitFileV1;
};

/**
 * Single source of truth for default kit ordering.
 * Array index is the compact code (0-9), keeping encoding/decoding in sync.
 */
const DEFAULT_KITS: DefaultKitDefinition[] = [
  { id: "kit-0", loader: kitLoaders.eightOhEight },
  { id: "kit-1", loader: kitLoaders.organic },
  { id: "kit-2", loader: kitLoaders.funk },
  { id: "kit-3", loader: kitLoaders.rnb },
  { id: "kit-4", loader: kitLoaders.trap },
  { id: "kit-5", loader: kitLoaders.eighties },
  { id: "kit-6", loader: kitLoaders.tech_house },
  { id: "kit-7", loader: kitLoaders.fabriken },
  { id: "kit-8", loader: kitLoaders.indie },
  { id: "kit-9", loader: kitLoaders.jungle },
];

const KIT_ID_TO_DEF = new Map<string, DefaultKitDefinition>();
const KIT_ID_TO_CODE = new Map<string, string>();
const KIT_CODE_TO_DEF = new Map<string, DefaultKitDefinition>();

DEFAULT_KITS.forEach((kit, index) => {
  const code = String(index);
  KIT_ID_TO_DEF.set(kit.id, kit);
  KIT_ID_TO_CODE.set(kit.id, code);
  KIT_CODE_TO_DEF.set(code, kit);
});

export function kitIdToCompactCode(kitId: string): string | undefined {
  return KIT_ID_TO_CODE.get(kitId);
}

export function compactCodeToKitId(code: string): string | undefined {
  return KIT_CODE_TO_DEF.get(code)?.id;
}

export function getDefaultKitLoader(
  kitId: string,
): (() => KitFileV1) | undefined {
  return KIT_ID_TO_DEF.get(kitId)?.loader;
}

export function loadDefaultKit(kitId: string): KitFileV1 | undefined {
  const loader = getDefaultKitLoader(kitId);
  return loader?.();
}

export const defaultKitCount = DEFAULT_KITS.length;
