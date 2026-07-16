/**
 * Canonical-to-engine boundary layer.
 *
 * The stores hold canonical units (docs/data-representation.md): dB, seconds,
 * -1..1 pan, semitone offsets, a `{ side, cutoffHz }` filter, 0..1 macro
 * fractions, a Tone swing fraction. Canonical equals the engine-native value
 * except for the two principled musical exceptions, so this boundary is thin:
 *
 *  - pitch: semitone offset -> playback Hz (canonical/tune.ts),
 *  - split filter: passed through as `{ side, cutoffHz }`; the engine derives
 *    node frequencies (engine/fx/split-filter.ts),
 *  - master macros: one canonical fraction drives two engine params
 *    (saturation -> wet + amount, reverb -> wet + decay).
 *
 * Everything else is a pass-through. No 0-100 knob value appears here.
 */

import { semitonesToHz } from "@/core/audio/canonical/tune";
import {
  MASTER_REVERB_DECAY_RANGE,
  MASTER_SATURATION_AMOUNT_RANGE,
} from "@/core/audio/engine/constants";
import type {
  ChannelPlayParams,
  ContinuousRuntimeParams,
} from "@/core/audio/engine/instrument/types";
import type { MasterChainSettings } from "@/core/audio/engine/master-bus";
import type { InstrumentParams } from "@/features/instrument/types/instrument";
import { lerp } from "@/shared/lib/utils";

/**
 * The master chain in canonical units, held by the master-chain store. Each
 * macro is a 0..1 fraction; the engine expansion (wet + companion) lives in
 * mapMasterToSettings below.
 */
interface MasterChainCanonical {
  filter: ContinuousRuntimeParams["filter"];
  /** Saturation macro (0..1): drives wet and drive amount. */
  saturation: number;
  /** Phaser wet (0..1). */
  phaser: number;
  /** Reverb macro (0..1): drives wet and decay. */
  reverb: number;
  /** Compressor threshold in dB. */
  compThreshold: number;
  /** Compressor ratio, integer 1..8. */
  compRatio: number;
  /** Compressor attack in seconds. */
  compAttack: number;
  /** Parallel compression wet/dry (0..1). */
  compMix: number;
  /** Master output level in dB (-Infinity = silence). */
  masterVolume: number;
}

/**
 * Expands the canonical master chain to engine settings. The filter passes
 * through as canonical; the two macros fan out to their engine companions
 * (saturation -> wet + drive amount, reverb -> wet + decay), each a linear
 * ramp over the companion's range so the wet fraction stays the single
 * canonical control.
 */
function mapMasterToSettings(
  params: MasterChainCanonical,
): MasterChainSettings {
  return {
    filter: params.filter,
    saturationWet: params.saturation,
    saturationAmount: lerp(
      params.saturation,
      MASTER_SATURATION_AMOUNT_RANGE[0],
      MASTER_SATURATION_AMOUNT_RANGE[1],
    ),
    phaserWet: params.phaser,
    reverbWet: params.reverb,
    reverbDecay: lerp(
      params.reverb,
      MASTER_REVERB_DECAY_RANGE[0],
      MASTER_REVERB_DECAY_RANGE[1],
    ),
    compThreshold: params.compThreshold,
    compRatio: params.compRatio,
    compAttack: params.compAttack,
    compMix: params.compMix,
    masterVolume: params.masterVolume,
  };
}

/**
 * An instrument's continuous canonical params (filter, pan, volume) applied
 * directly to the audio nodes. All three are already engine-native.
 */
function instrumentContinuousParams(
  params: InstrumentParams,
): ContinuousRuntimeParams {
  return {
    filter: params.filter,
    pan: params.pan,
    volume: params.volume,
  };
}

/**
 * An instrument's per-note canonical params (tune, decay) plus flags
 * (mute, solo). Only pitch is derived: the semitone offset becomes the
 * playback frequency the scheduler reads on every trigger.
 */
function instrumentPlayParams(params: InstrumentParams): ChannelPlayParams {
  return {
    pitch: semitonesToHz(params.tune),
    decaySeconds: params.decay,
    mute: params.mute,
    solo: params.solo,
  };
}

export {
  instrumentContinuousParams,
  instrumentPlayParams,
  mapMasterToSettings,
};
export type { MasterChainCanonical };
