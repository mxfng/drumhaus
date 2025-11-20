import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { Meta } from "@/types/meta";
import type { PresetFileV1 } from "@/types/preset";

/**
 * Generate a Preset object from current store state
 * Single source of truth - reads fresh data from all stores
 *
 * @param presetMeta - The metadata for this preset (id, name, timestamps)
 * @param kitMeta - The metadata for the kit (id, name, timestamps)
 */
export function getCurrentPreset(
  presetMeta: Meta,
  kitMeta: Meta,
): PresetFileV1 {
  const instruments = useInstrumentsStore.getState().instruments;
  const { pattern, variationCycle } = usePatternStore.getState();
  const { bpm, swing } = useTransportStore.getState();
  const {
    lowPass,
    highPass,
    phaser,
    reverb,
    compThreshold,
    compRatio,
    masterVolume,
  } = useMasterChainStore.getState();

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
      variationCycle,
    },
    masterChain: {
      lowPass,
      highPass,
      phaser,
      reverb,
      compThreshold,
      compRatio,
      masterVolume,
    },
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
export function arePresetsEqual(a: PresetFileV1, b: PresetFileV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
