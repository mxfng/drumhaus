import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { useSequencerStore } from "@/stores/useSequencerStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { Preset } from "@/types/types";

/**
 * Generate a Preset object from current store state
 * Single source of truth - reads fresh data from all stores
 */
export function getCurrentPreset(name: string, kitName: string): Preset {
  const instruments = useInstrumentsStore.getState().instruments;
  const { pattern, variation, chain } = useSequencerStore.getState();
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
    _kit: {
      name: kitName,
      instruments,
    },
    _pattern: pattern,
    _variation: variation,
    _chain: chain,
    _bpm: bpm,
    _swing: swing,
    _lowPass: lowPass,
    _hiPass: hiPass,
    _phaser: phaser,
    _reverb: reverb,
    _compThreshold: compThreshold,
    _compRatio: compRatio,
    _masterVolume: masterVolume,
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
