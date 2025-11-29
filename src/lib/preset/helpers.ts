import { useInstrumentsStore } from "@/features/instruments/store/useInstrumentsStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { getMasterChainParams } from "@/stores/useMasterChainStore";
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
      variationCycle,
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
export function arePresetsEqual(a: PresetFileV1, b: PresetFileV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Validates a parsed preset file object
 */
export function validatePresetFile(data: unknown): PresetFileV1 {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid preset file: expected an object");
  }

  const preset = data as Record<string, unknown>;

  if (preset.kind !== "drumhaus.preset") {
    throw new Error("Invalid preset file type");
  }
  if (preset.version !== 1) {
    throw new Error(`Unsupported preset version: ${preset.version}`);
  }

  return preset as unknown as PresetFileV1;
}
