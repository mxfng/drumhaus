import {
  INSTRUMENT_ATTACK_DEFAULT,
  INSTRUMENT_ATTACK_RANGE,
  INSTRUMENT_PAN_DEFAULT,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_PITCH_BASE_FREQUENCY,
  INSTRUMENT_PITCH_SEMITONE_RANGE,
  INSTRUMENT_RELEASE_DEFAULT,
  INSTRUMENT_RELEASE_RANGE,
  INSTRUMENT_VOLUME_DEFAULT,
  INSTRUMENT_VOLUME_RANGE,
  MASTER_COMP_DEFAULT_MIX,
  MASTER_COMP_DEFAULT_RATIO,
  MASTER_COMP_DEFAULT_THRESHOLD,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_FILTER_RANGE,
  MASTER_HIGH_PASS_DEFAULT,
  MASTER_LOW_PASS_DEFAULT,
  MASTER_PHASER_DEFAULT,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_REVERB_DEFAULT,
  MASTER_REVERB_WET_RANGE,
  MASTER_VOLUME_DEFAULT,
  MASTER_VOLUME_RANGE,
} from "@/core/audio/engine/constants";
import { KNOB_VALUE_DEFAULT, KNOB_VALUE_MAX } from "./constants";
import {
  formatDisplayAttackDuration,
  formatDisplayCompRatio,
  formatDisplayFilter,
  formatDisplayPercentage,
  formatDisplayPitchSemitone,
  formatDisplayReleaseDuration,
  formatDisplayVolumeInstrument as formatDisplayVolume,
  formatDisplayVolumeMaster,
} from "./format";
import {
  inverseTransformKnobValue,
  inverseTransformKnobValueExponential,
  inverseTransformKnobValuePitch,
  inverseTransformKnobValueSplitFilter,
  KNOB_ROTATION_THRESHOLD_L,
  transformKnobValueExponential,
  transformKnobValueLinear,
  transformKnobValuePitch,
  transformKnobValueSplitFilter,
} from "./transform";
import { FormattedValue, ParamMapping } from "./types";

// --- Core mapping factories ---

interface MappingOptions {
  knobValueCount?: number;
  defaultKnobValue?: number;
}

/**
 * Creates a linear mapping from knob values (0-100) to a parameter range.
 * Uses transformKnobValue for the forward direction to ensure consistency with audio engine.
 *
 * @param range - [min, max] range for the parameter
 * @param format - Display formatting function
 * @param options - Optional stepCount and defaultStep overrides
 */
const makeLinearMapping = (
  range: [number, number],
  format: (value: number) => FormattedValue,
  options: MappingOptions = {},
): ParamMapping<number> => ({
  knobValueCount: options.knobValueCount ?? KNOB_VALUE_MAX,
  defaultKnobValue: options.defaultKnobValue ?? KNOB_VALUE_DEFAULT,
  knobToDomain: (knobValue) => transformKnobValueLinear(knobValue, range),
  domainToKnob: (value) => inverseTransformKnobValue(value, range),
  format,
});

/**
 * Creates an exponential mapping for parameters that need non-linear response.
 * Uses transformKnobValueExponential to ensure consistency with audio engine.
 * Useful for time-based parameters (attack, release) and frequency.
 *
 * @param range - [min, max] range for the parameter
 * @param format - Display formatting function
 * @param options - Optional stepCount and defaultStep overrides
 */
const makeExponentialMapping = (
  range: [number, number],
  format: (value: number) => FormattedValue,
  options: MappingOptions = {},
): ParamMapping<number> => ({
  knobToDomain: (knobValue) => transformKnobValueExponential(knobValue, range),
  domainToKnob: (value) => inverseTransformKnobValueExponential(value, range),
  format,
  defaultKnobValue: options.defaultKnobValue ?? KNOB_VALUE_DEFAULT,
  knobValueCount: options.knobValueCount ?? KNOB_VALUE_MAX,
});

// --- Mapping decorators ---

/**
 * Wraps a mapping to add integer quantization.
 * Ensures stepToValue returns whole numbers and valueToStep handles them.
 *
 * @example
 * // Compressor ratio: 1:1, 2:1, 3:1, ... 8:1 (no fractional ratios)
 * const ratioMapping = withIntegerQuantization(
 *   makeLinearMapping([1, 8], formatRatio, 8)
 * );
 */
const withIntegerQuantization = (
  baseMapping: ParamMapping<number>,
): ParamMapping<number> => ({
  ...baseMapping,

  knobToDomain(knobValue) {
    const rawValue = baseMapping.knobToDomain(knobValue);
    return Math.round(rawValue);
  },

  domainToKnob(value) {
    const rounded = Math.round(value);
    return baseMapping.domainToKnob(rounded);
  },
});

/**
 * Wraps a mapping to treat knob position 0 as -Infinity.
 * Useful for volume controls where 0 = complete silence.
 *
 * @example
 * const volumeMapping = withInfinityAtZero(
 *   makeLinearMapping([-60, 0], formatVolume)
 * );
 */
const withInfinityAtZero = (
  baseMapping: ParamMapping<number>,
): ParamMapping<number> => ({
  ...baseMapping,

  knobToDomain(knobValue) {
    if (knobValue === 0) return -Infinity;
    return baseMapping.knobToDomain(knobValue);
  },

  domainToKnob(value) {
    if (value === -Infinity) return 0;
    return baseMapping.domainToKnob(value);
  },
});

// --- Specialized mappings ---

/**
 * Pitch mapping with semitone quantization.
 * Uses transformKnobValuePitch to ensure consistency with audio engine.
 * Center (50) = no pitch change, ±24 semitones range.
 */
export const pitchMapping: ParamMapping<number> = {
  knobValueCount: 48, // 48 discrete positions for fine semitone control
  defaultKnobValue: 50, // Center = base frequency

  knobToDomain: (knobValue) => {
    const freq = transformKnobValuePitch(knobValue);
    // Round to whole semitones for clean musical intervals
    const ratio = freq / INSTRUMENT_PITCH_BASE_FREQUENCY;
    const semitoneOffset = Math.round(Math.log2(ratio) * 12);
    const cleanRatio = Math.pow(2, semitoneOffset / 12);
    return INSTRUMENT_PITCH_BASE_FREQUENCY * cleanRatio;
  },

  domainToKnob: (frequency) => inverseTransformKnobValuePitch(frequency),

  format: (_frequency, knobValue) => {
    // Calculate display semitone offset
    const normalized = (knobValue - 50) / 50;
    const semitoneOffsetRaw = normalized * INSTRUMENT_PITCH_SEMITONE_RANGE;
    const semitoneOffset = Math.round(semitoneOffsetRaw);
    return formatDisplayPitchSemitone(semitoneOffset);
  },
};

/**
 * Split filter mapping with mode switching.
 * Uses transformKnobValueSplitFilter to ensure consistency with audio engine.
 * Left half (0-49) = Low-pass filter, Right half (50-100) = High-pass filter
 */
export const splitFilterMapping: ParamMapping<number> = {
  knobValueCount: KNOB_VALUE_MAX,
  defaultKnobValue: KNOB_VALUE_DEFAULT,

  knobToDomain: (knobValue) =>
    transformKnobValueSplitFilter(
      knobValue,
      MASTER_FILTER_RANGE,
      MASTER_FILTER_RANGE,
    ),

  domainToKnob: (freq, currentKnobValue) =>
    inverseTransformKnobValueSplitFilter(
      freq,
      currentKnobValue,
      MASTER_FILTER_RANGE,
    ),

  format: (freq, knobValue) => {
    const modeLabel = knobValue <= KNOB_ROTATION_THRESHOLD_L ? "LP" : "HP";
    if (freq < 1000) {
      return { value: freq.toFixed(0), append: `Hz ${modeLabel}` };
    }
    return { value: (freq / 1000).toFixed(1), append: `kHz ${modeLabel}` };
  },
};

// --- Instrument parameter mappings ---

/**
 * Attack envelope time (exponential for natural feel)
 */
export const instrumentAttackMapping = makeExponentialMapping(
  INSTRUMENT_ATTACK_RANGE,
  formatDisplayAttackDuration,
  {
    defaultKnobValue: INSTRUMENT_ATTACK_DEFAULT,
  },
);

/**
 * Release envelope time (exponential for natural feel)
 */
export const instrumentReleaseMapping = makeExponentialMapping(
  INSTRUMENT_RELEASE_RANGE,
  formatDisplayReleaseDuration,
  {
    defaultKnobValue: INSTRUMENT_RELEASE_DEFAULT,
  },
);

/**
 * Instrument volume with -∞ at position 0
 */
export const instrumentVolumeMapping = withInfinityAtZero(
  makeLinearMapping(INSTRUMENT_VOLUME_RANGE, formatDisplayVolume, {
    defaultKnobValue: INSTRUMENT_VOLUME_DEFAULT,
  }),
);

/**
 * Stereo panning (0% = left, 50% = center, 100% = right)
 */
export const instrumentPanMapping = makeLinearMapping(
  INSTRUMENT_PAN_RANGE,
  formatDisplayPercentage,
  {
    defaultKnobValue: INSTRUMENT_PAN_DEFAULT,
  },
);

// --- Master / FX parameter mappings ---

/**
 * Master output volume with -∞ at position 0
 */
export const masterVolumeMapping = withInfinityAtZero(
  makeLinearMapping(MASTER_VOLUME_RANGE, formatDisplayVolume, {
    defaultKnobValue: MASTER_VOLUME_DEFAULT,
  }),
);

/**
 * Low-pass filter cutoff frequency (exponential)
 */
export const lowPassFilterMapping = makeExponentialMapping(
  MASTER_FILTER_RANGE,
  formatDisplayFilter,
  {
    defaultKnobValue: MASTER_LOW_PASS_DEFAULT,
  },
);

/**
 * High-pass filter cutoff frequency (exponential)
 */
export const highPassFilterMapping = makeExponentialMapping(
  MASTER_FILTER_RANGE,
  formatDisplayFilter,
  {
    defaultKnobValue: MASTER_HIGH_PASS_DEFAULT,
  },
);

/**
 * Phaser effect wet/dry mix (0-100%)
 */
export const phaserWetMapping = makeLinearMapping(
  MASTER_PHASER_WET_RANGE,
  formatDisplayPercentage,
  {
    defaultKnobValue: MASTER_PHASER_DEFAULT,
  },
);

/**
 * Reverb effect wet/dry mix (0-100%)
 */
export const reverbWetMapping = makeLinearMapping(
  MASTER_REVERB_WET_RANGE,
  formatDisplayPercentage,
  {
    defaultKnobValue: MASTER_REVERB_DEFAULT,
  },
);

/**
 * Reverb decay time (0-100%)
 */
export const reverbDecayMapping = makeLinearMapping(
  MASTER_REVERB_DECAY_RANGE,
  formatDisplayPercentage,
);

/**
 * Compressor threshold level (dB)
 */
export const compThresholdMapping = makeLinearMapping(
  MASTER_COMP_THRESHOLD_RANGE,
  formatDisplayVolumeMaster,
  {
    defaultKnobValue: MASTER_COMP_DEFAULT_THRESHOLD,
  },
);

/**
 * Compressor ratio with integer quantization (1:1, 2:1, ... 8:1)
 */
export const compRatioMapping = withIntegerQuantization(
  makeLinearMapping(MASTER_COMP_RATIO_RANGE, formatDisplayCompRatio, {
    knobValueCount: 7,
    defaultKnobValue: MASTER_COMP_DEFAULT_RATIO,
  }),
);

/**
 * Compressor parallel mix (0-100%)
 */
export const compMixMapping = makeLinearMapping(
  MASTER_COMP_MIX_RANGE,
  formatDisplayPercentage,
  {
    defaultKnobValue: MASTER_COMP_DEFAULT_MIX,
  },
);
