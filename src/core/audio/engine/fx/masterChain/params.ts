import { getDestination } from "tone/build/esm/index";

import {
  compAttackMapping,
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
  masterVolumeMapping,
  phaserWetMapping,
  reverbDecayMapping,
  reverbWetMapping,
  saturationAmountMapping,
  saturationWetMapping,
} from "@/shared/knob/lib/mapping";
import { MASTER_FILTER_RANGE } from "../../constants";
import { applySplitFilterWithRamp } from "../splitFilter";
import {
  MasterChainParams,
  MasterChainRuntimes,
  MasterChainSettings,
} from "./types";

/**
 * Maps knob params → concrete numeric settings.
 */
export function mapParamsToSettings(
  params: MasterChainParams,
): MasterChainSettings {
  return {
    filter: params.filter, // Pass raw knob value for split filter logic
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
 * Applies master chain settings to runtime nodes.
 * Shared between online and offline contexts.
 */
export function applySettingsToRuntimes(
  runtimes: MasterChainRuntimes,
  settings: MasterChainSettings,
): void {
  // Compressor settings
  runtimes.compressor.threshold.value = settings.compThreshold;
  runtimes.compressor.ratio.value = settings.compRatio;
  runtimes.compressor.attack.value = settings.compAttack;
  // Parallel compression wet/dry mix
  runtimes.compWetGain.gain.value = settings.compMix;
  runtimes.compDryGain.gain.value = 1 - settings.compMix;

  // Split filter settings (same as instrument filter implementation)
  applySplitFilterWithRamp(
    runtimes.lowPassFilter,
    runtimes.highPassFilter,
    settings.filter,
    {
      minFrequency: MASTER_FILTER_RANGE[0],
      maxFrequency: MASTER_FILTER_RANGE[1],
    },
  );

  // Saturation wet/dry mix
  runtimes.saturation.distortion = settings.saturationAmount;
  runtimes.saturation.wet.value = settings.saturationWet;

  // Effect send settings
  runtimes.phaserSendGain.gain.value = settings.phaserWet;
  runtimes.reverbSendGain.gain.value = settings.reverbWet;
  runtimes.reverb.decay = settings.reverbDecay;

  // Master volume is applied directly to the global destination.
  getDestination().volume.value = settings.masterVolume;
}
