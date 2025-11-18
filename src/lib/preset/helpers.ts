import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { PresetFileV1 } from "@/types/preset";

/**
 * Generate a Preset object from current store state
 * Single source of truth - reads fresh data from all stores
 */
export function getCurrentPreset(
  // TODO: this is not enough info to keep track of metadata for preset AND kit, should use meta
  presetId: string,
  presetName: string,
  kitId: string,
  kitName: string,
): PresetFileV1 {
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

  const now = new Date().toISOString();

  return {
    kind: "drumhaus.preset",
    version: 1,
    meta: {
      id: presetId,
      name: presetName,
      createdAt: now, // TODO: track an actual creation date
      updatedAt: now,
    },
    kit: {
      kind: "drumhaus.kit",
      version: 1,
      meta: {
        // TODO: track kit meta in state or retrieve from kit file for saving
        id: kitId,
        name: kitName,
        createdAt: now,
        updatedAt: now,
      },
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
export function arePresetsEqual(a: PresetFileV1, b: PresetFileV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
