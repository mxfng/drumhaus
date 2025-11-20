import * as kitLoaders from "@/lib/kit";
import type { KitFileV1 } from "@/types/instrument";

type DefaultKitDefinition = {
  id: string;
  loader: () => KitFileV1;
};

/**
 * Single source of truth for default kit ordering.
 * Array index is the compact code (0-9), keeping encoding/decoding in sync.
 */
const DEFAULT_KITS: DefaultKitDefinition[] = [
  { id: "kit-drumhaus", loader: kitLoaders.drumhaus },
  { id: "kit-organic", loader: kitLoaders.organic },
  { id: "kit-funk", loader: kitLoaders.funk },
  { id: "kit-rnb", loader: kitLoaders.rnb },
  { id: "kit-trap", loader: kitLoaders.trap },
  { id: "kit-eighties", loader: kitLoaders.eighties },
  { id: "kit-tech-house", loader: kitLoaders.tech_house },
  { id: "kit-techno", loader: kitLoaders.techno },
  { id: "kit-indie", loader: kitLoaders.indie },
  { id: "kit-jungle", loader: kitLoaders.jungle },
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
