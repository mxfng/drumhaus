/**
 * Knob-to-domain boundary layer.
 *
 * Converts 0-100 UI knob values into the domain units the audio engine
 * speaks (dB, -1..1 pan, seconds, Hz, Tone swing). All knobToDomain mapping
 * for engine-bound parameters happens here, at the boundary - nothing under
 * engine/ converts knob values itself.
 */

import {
  TRANSPORT_SWING_MAX,
  TRANSPORT_SWING_RANGE,
} from "@/core/audio/engine/constants";
import type {
  ChannelPlayParams,
  ContinuousRuntimeParams,
} from "@/core/audio/engine/instrument/types";
import type { MasterChainSettings } from "@/core/audio/engine/master-bus";
import type { InstrumentParams } from "@/features/instrument/types/instrument";
import {
  compAttackMapping,
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
  instrumentDecayMapping,
  instrumentPanMapping,
  instrumentVolumeMapping,
  masterVolumeMapping,
  phaserWetMapping,
  reverbDecayMapping,
  reverbWetMapping,
  saturationAmountMapping,
  saturationWetMapping,
  tuneMapping,
} from "@/shared/knob/lib/mapping";

/**
 * Master chain parameters as 0-100 knob values.
 *
 * This is the knob-level shape held by the master chain store and
 * serialized in presets; it belongs to the UI boundary, not the engine.
 * The engine works with MasterChainSettings (domain values) instead.
 */
interface MasterChainParams {
  // New unified filter (replaces lowPass/highPass)
  filter: number;
  saturation: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compMix: number; // Parallel compression wet/dry (0-100 knob value)
  masterVolume: number;

  // Legacy fields (for backward compatibility during migration)
  lowPass?: number;
  highPass?: number;
}

/**
 * Maps master chain knob params to concrete domain settings.
 */
function mapParamsToSettings(params: MasterChainParams): MasterChainSettings {
  return {
    // The split-filter position 0-100 is itself the domain value; its
    // semantics live in engine/fx/split-filter.ts.
    filter: params.filter,
    saturationWet: saturationWetMapping.knobToDomain(params.saturation),
    saturationAmount: saturationAmountMapping.knobToDomain(params.saturation),
    phaserWet: phaserWetMapping.knobToDomain(params.phaser),
    reverbWet: reverbWetMapping.knobToDomain(params.reverb),
    reverbDecay: reverbDecayMapping.knobToDomain(params.reverb),
    compThreshold: compThresholdMapping.knobToDomain(params.compThreshold),
    compRatio: compRatioMapping.knobToDomain(params.compRatio),
    compAttack: compAttackMapping.knobToDomain(params.compAttack),
    compMix: compMixMapping.knobToDomain(params.compMix),
    masterVolume: masterVolumeMapping.knobToDomain(params.masterVolume),
  };
}

/**
 * Converts an instrument's continuous knob params (filter, pan, volume)
 * to the domain values applied to audio nodes.
 */
function instrumentKnobsToContinuousParams(
  params: InstrumentParams,
): ContinuousRuntimeParams {
  return {
    // The split-filter position 0-100 is itself the domain value; its
    // semantics live in engine/fx/split-filter.ts.
    filter: params.filter,
    pan: instrumentPanMapping.knobToDomain(params.pan),
    volume: instrumentVolumeMapping.knobToDomain(params.volume),
  };
}

/**
 * Converts an instrument's per-note knob params (tune, decay) plus flags
 * (mute, solo) to the play params the scheduler reads on every trigger.
 */
function instrumentKnobsToPlayParams(
  params: InstrumentParams,
): ChannelPlayParams {
  return {
    pitch: tuneMapping.knobToDomain(params.tune),
    decaySeconds: instrumentDecayMapping.knobToDomain(params.decay),
    mute: params.mute,
    solo: params.solo,
  };
}

/**
 * Converts the 0-100 swing knob value to Tone transport swing (0-0.5).
 */
function transportSwingKnobToDomain(swing: number): number {
  return (swing / TRANSPORT_SWING_RANGE[1]) * TRANSPORT_SWING_MAX;
}

export {
  instrumentKnobsToContinuousParams,
  instrumentKnobsToPlayParams,
  mapParamsToSettings,
  transportSwingKnobToDomain,
};
export type { MasterChainParams };
