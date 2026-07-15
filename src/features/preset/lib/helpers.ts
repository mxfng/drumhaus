import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { getMasterChainParams } from "@/features/master-bus/store/use-master-chain-store";
import { PRESET_FILE_VERSION } from "@/features/preset/document";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import type { Meta } from "@/features/preset/types/meta";
import type {
  PresetFileV1,
  PresetListItem,
} from "@/features/preset/types/preset";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";

/**
 * Generate a Preset object from current store state
 * Single source of truth - reads fresh data from all stores
 *
 * @param presetMeta - The metadata for this preset (id, name, timestamps)
 * @param kitMeta - The metadata for the kit (id, name, timestamps)
 */
function getCurrentPreset(presetMeta: Meta, kitMeta: Meta): PresetFileV1 {
  const instruments = useInstrumentsStore.getState().instruments;
  const { pattern, chain, chainEnabled } = usePatternStore.getState();
  const { bpm, swing } = useTransportStore.getState();
  const masterChain = getMasterChainParams();

  return {
    kind: "drumhaus.preset",
    version: PRESET_FILE_VERSION,
    meta: {
      ...presetMeta,
      updatedAt: new Date().toISOString(),
    },
    kit: {
      kind: "drumhaus.kit",
      version: 1,
      meta: kitMeta,
      instruments,
    },
    transport: {
      bpm,
      swing,
    },
    sequencer: {
      pattern,
      chain,
      chainEnabled,
    },
    masterChain,
  };
}

/**
 * Check if a preset ID corresponds to a factory preset
 */
function isFactoryPreset(presetId: string): boolean {
  const defaultPresets = getDefaultPresets();
  return defaultPresets.some((p) => p.meta.id === presetId);
}

/**
 * Generate a unique duplicate name for a preset
 * Appends " Copy" or " Copy N" to avoid conflicts
 */
function generateDuplicateName(
  baseName: string,
  existingPresets: PresetListItem[],
): string {
  const nameSet = new Set(existingPresets.map((p) => p.meta.name));

  let newName = `${baseName} Copy`;
  let counter = 2;

  while (nameSet.has(newName)) {
    newName = `${baseName} Copy ${counter}`;
    counter++;
  }

  return newName;
}

export { getCurrentPreset, isFactoryPreset, generateDuplicateName };
