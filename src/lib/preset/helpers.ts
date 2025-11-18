import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { Preset } from "@/types/preset";

/**
 * Generate a Preset object from current store state
 * Single source of truth - reads fresh data from all stores
 */
export function getCurrentPreset(name: string, kitName: string): Preset {
  const instruments = useInstrumentsStore.getState().instruments;
  const { pattern, variationCycle } = usePatternStore.getState();
  const { bpm, swing } = useTransportStore.getState();
  const {
    lowPass,
    hiPass,
    phaser,
    reverb,
    compThreshold,
    compRatio,
    masterVolume,
  } = useMasterChainStore.getState();

  return {
    name,
    kit: {
      name: kitName,
      instruments,
    },
    pattern,
    variationCycle,
    bpm,
    swing,
    masterChain: {
      lowPass,
      hiPass,
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
export function arePresetsEqual(a: Preset, b: Preset): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
