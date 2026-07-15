import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { getMasterChainParams } from "@/features/master-bus/store/use-master-chain-store";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import type { Meta } from "@/features/preset/types/meta";
import type { PresetFileV1 } from "@/features/preset/types/preset";
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
    version: 1,
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
 * Deep equality check for two Preset objects
 *
 * Uses JSON.stringify since both presets are created from getCurrentPreset()
 * with deterministic property ordering from the stores. This is safe because:
 * - No undefined values (all stores have defaults)
 * - No functions or special objects
 * - Consistent property ordering from object literals
 * - Arrays maintain order
 */
function arePresetsEqual(a: PresetFileV1, b: PresetFileV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
  existingPresets: PresetFileV1[],
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

export {
  getCurrentPreset,
  arePresetsEqual,
  isFactoryPreset,
  generateDuplicateName,
};
