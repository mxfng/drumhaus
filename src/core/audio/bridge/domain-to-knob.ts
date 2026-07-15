/**
 * Domain-to-knob boundary layer.
 *
 * Inverse of knob-to-domain.ts: converts the domain units the audio engine
 * speaks (dB, -1..1 pan, seconds, Hz, Tone swing) back into 0-100 UI knob
 * values, e.g. when reconstructing knob-space store state from a
 * domain-space preset document. All outputs are clamped to [0, 100] and
 * left continuous (unrounded); quantization is the caller's choice.
 */

import {
  INSTRUMENT_TUNE_BASE_FREQUENCY,
  INSTRUMENT_TUNE_SEMITONE_RANGE,
  MASTER_COMP_RATIO_RANGE,
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
} from "@/shared/knob/lib/mapping";
import { ratioToSemitones } from "@/shared/knob/lib/utils";
import { clamp } from "@/shared/lib/utils";
import type { MasterChainParams } from "./knob-to-domain";

const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

/**
 * Tolerance for companion-field consistency checks in mapSettingsToParams.
 * The companion fields are derived from the same knob, so any drift beyond
 * float noise means the settings did not come from the forward recipe.
 */
const COMPANION_FIELD_EPSILON = 1e-4;

function clampKnob(value: number): number {
  return clamp(value, 0, 100);
}

/**
 * Split-filter positions (instrument filter, master filter) are identity
 * pass-throughs in the bridge: the 0-100 store value IS the engine's
 * domain value. Included so the inverse surface is total.
 */
function splitFilterPositionToKnob(position: number): number {
  return clampKnob(position);
}

/**
 * Inverse of tuneMapping.knobToDomain: playback frequency (Hz) back to the
 * 0-100 tune knob. Unlike inverseTransformKnobValueTune (which rounds for
 * UI snapping), this returns the continuous knob value.
 */
function tuneDomainToKnob(frequencyHz: number): number {
  const semitoneOffset = ratioToSemitones(
    frequencyHz / INSTRUMENT_TUNE_BASE_FREQUENCY,
  );
  const normalized = clamp(
    semitoneOffset / INSTRUMENT_TUNE_SEMITONE_RANGE,
    -1,
    1,
  );
  return clampKnob(normalized * 50 + 50);
}

/**
 * Inverse of instrumentVolumeMapping.knobToDomain. -Infinity (and null,
 * its JSON-safe spelling in preset documents) inverts to knob 0.
 */
function instrumentVolumeDomainToKnob(volumeDb: number | null): number {
  if (volumeDb === null) return 0;
  return clampKnob(instrumentVolumeMapping.domainToKnob(volumeDb));
}

/**
 * Inverse of masterVolumeMapping.knobToDomain. -Infinity (and null,
 * its JSON-safe spelling in preset documents) inverts to knob 0.
 */
function masterVolumeDomainToKnob(volumeDb: number | null): number {
  if (volumeDb === null) return 0;
  return clampKnob(masterVolumeMapping.domainToKnob(volumeDb));
}

/**
 * Inverse of the integer-quantized compRatioMapping.knobToDomain.
 *
 * Forward is Math.round(lerp(knob/100, 1, 8)), so each ratio owns the knob
 * interval [(r - 1.5), (r - 0.5)) * 100/7 clipped to [0, 100]. Returns the
 * center of that interval so forward(inverse(r)) === r with maximal margin
 * against float noise at the rounding boundaries.
 */
function compRatioDomainToKnob(ratio: number): number {
  const [min, max] = MASTER_COMP_RATIO_RANGE;
  const r = clamp(Math.round(ratio), min, max);
  const knobPerRatio = 100 / (max - min);
  const lo = Math.max(0, (r - min - 0.5) * knobPerRatio);
  const hi = Math.min(100, (r - min + 0.5) * knobPerRatio);
  return (lo + hi) / 2;
}

function warnIfCompanionInconsistent(
  field: keyof MasterChainSettings,
  actual: number,
  expected: number,
): void {
  if (!isDev) return;
  if (Math.abs(actual - expected) <= COMPANION_FIELD_EPSILON) return;
  console.warn(
    `[domain-to-knob] ${field} (${actual}) is inconsistent with the value ` +
      `derived from its companion wet field (expected ${expected}); ` +
      `the knob value was inverted from the wet field.`,
  );
}

/**
 * Maps master chain domain settings back to 0-100 knob params.
 * Inverse of mapParamsToSettings.
 *
 * Where one knob fans out to two settings fields (saturation ->
 * saturationWet + saturationAmount, reverb -> reverbWet + reverbDecay),
 * the knob is inverted from the wet field; in dev, a companion field that
 * does not match the forward recipe logs a warning.
 */
function mapSettingsToParams(settings: MasterChainSettings): MasterChainParams {
  const saturation = clampKnob(
    saturationWetMapping.domainToKnob(settings.saturationWet),
  );
  const reverb = clampKnob(reverbWetMapping.domainToKnob(settings.reverbWet));
  warnIfCompanionInconsistent(
    "saturationAmount",
    settings.saturationAmount,
    saturationAmountMapping.knobToDomain(saturation),
  );
  warnIfCompanionInconsistent(
    "reverbDecay",
    settings.reverbDecay,
    reverbDecayMapping.knobToDomain(reverb),
  );

  return {
    filter: splitFilterPositionToKnob(settings.filter),
    saturation,
    phaser: clampKnob(phaserWetMapping.domainToKnob(settings.phaserWet)),
    reverb,
    compThreshold: clampKnob(
      compThresholdMapping.domainToKnob(settings.compThreshold),
    ),
    compRatio: compRatioDomainToKnob(settings.compRatio),
    compAttack: clampKnob(compAttackMapping.domainToKnob(settings.compAttack)),
    compMix: clampKnob(compMixMapping.domainToKnob(settings.compMix)),
    masterVolume: masterVolumeDomainToKnob(settings.masterVolume),
  };
}

/**
 * Converts an instrument's continuous domain params (filter, pan, volume)
 * back to 0-100 knob params. Inverse of instrumentKnobsToContinuousParams.
 */
function continuousParamsToInstrumentKnobs(
  params: ContinuousRuntimeParams,
): Pick<InstrumentParams, "filter" | "pan" | "volume"> {
  return {
    filter: splitFilterPositionToKnob(params.filter),
    pan: clampKnob(instrumentPanMapping.domainToKnob(params.pan)),
    volume: instrumentVolumeDomainToKnob(params.volume),
  };
}

/**
 * Converts an instrument's per-note domain params (pitch, decay) plus flags
 * (mute, solo) back to 0-100 knob params. Inverse of
 * instrumentKnobsToPlayParams.
 */
function playParamsToInstrumentKnobs(
  params: ChannelPlayParams,
): Pick<InstrumentParams, "tune" | "decay" | "mute" | "solo"> {
  return {
    tune: tuneDomainToKnob(params.pitch),
    decay: clampKnob(instrumentDecayMapping.domainToKnob(params.decaySeconds)),
    mute: params.mute,
    solo: params.solo,
  };
}

/**
 * Converts Tone transport swing (0-TRANSPORT_SWING_MAX) back to the 0-100
 * swing knob value. Inverse of transportSwingKnobToDomain.
 */
function transportSwingDomainToKnob(swing: number): number {
  return clampKnob((swing / TRANSPORT_SWING_MAX) * TRANSPORT_SWING_RANGE[1]);
}

export {
  compRatioDomainToKnob,
  continuousParamsToInstrumentKnobs,
  instrumentVolumeDomainToKnob,
  mapSettingsToParams,
  masterVolumeDomainToKnob,
  playParamsToInstrumentKnobs,
  splitFilterPositionToKnob,
  transportSwingDomainToKnob,
  tuneDomainToKnob,
};
