import {
  INSTRUMENT_ATTACK_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_PITCH_BASE_FREQUENCY,
  INSTRUMENT_PITCH_SEMITONE_RANGE,
  INSTRUMENT_RELEASE_RANGE,
  INSTRUMENT_VOLUME_RANGE,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_FILTER_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_REVERB_WET_RANGE,
  MASTER_VOLUME_RANGE,
} from "@/lib/audio/engine/constants";
import {
  KNOB_ROTATION_THRESHOLD_L,
  transformKnobValueSplitFilter,
} from "@/lib/knob/transform";
import { KNOB_STEP_DEFAULT, KNOB_STEP_MAX } from "./constants";
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
import { FormattedValue, ParamMapping } from "./types";

// --- Utilities ---

/**
 * Clamp a value to [0, 100] range
 */
const clamp = (value: number): number => Math.min(100, Math.max(0, value));

/**
 * Normalize a knob value (0-100) to [0, 1]
 */
const normalize = (knobValue: number): number => clamp(knobValue) / 100;

/**
 * Denormalize a [0, 1] value to knob value (0-100)
 */
const denormalize = (t: number): number =>
  Math.min(100, Math.max(0, Math.round(t * 100)));

// --- Core mapping factories ---

/**
 * Creates a linear mapping from knob values (0-100) to a parameter range.
 *
 * @param range - [min, max] range for the parameter
 * @param format - Display formatting function
 * @param stepCount - Number of discrete UI positions (default: 100)
 * @param defaultStep - Default knob value (default: 50)
 */
const makeLinearMapping = (
  range: [number, number],
  format: (value: number) => FormattedValue,
  stepCount = KNOB_STEP_MAX,
  defaultStep = KNOB_STEP_DEFAULT,
): ParamMapping<number> => {
  const [min, max] = range;

  return {
    stepCount,
    defaultStep,

    stepToValue: (knobValue) => {
      const t = normalize(knobValue);
      return min + t * (max - min);
    },

    valueToStep: (value) => {
      if (value <= min) return 0;
      if (value >= max) return 100;
      const t = (value - min) / (max - min);
      return denormalize(t);
    },

    format,
  };
};

/**
 * Creates an exponential mapping for parameters that need non-linear response.
 * Useful for time-based parameters (attack, release) and frequency.
 *
 * @param range - [min, max] range for the parameter
 * @param format - Display formatting function
 * @param stepCount - Number of discrete UI positions (default: 100)
 * @param defaultStep - Default knob value (default: 50)
 * @param curvePower - Exponential curve power (default: 2)
 */
const makeExponentialMapping = (
  range: [number, number],
  format: (value: number) => FormattedValue,
  stepCount = KNOB_STEP_MAX,
  defaultStep = KNOB_STEP_DEFAULT,
  curvePower = 2,
): ParamMapping<number> => {
  const [min, max] = range;

  return {
    stepCount,
    defaultStep,

    stepToValue: (knobValue) => {
      const t = normalize(knobValue);
      const curved = Math.pow(t, curvePower);
      return min + curved * (max - min);
    },

    valueToStep: (value) => {
      if (value <= min) return 0;
      if (value >= max) return 100;
      const normalized = (value - min) / (max - min);
      const t = Math.pow(normalized, 1 / curvePower);
      return denormalize(t);
    },

    format,
  };
};

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

  stepToValue(knobValue) {
    const rawValue = baseMapping.stepToValue(knobValue);
    return Math.round(rawValue);
  },

  valueToStep(value) {
    const rounded = Math.round(value);
    return baseMapping.valueToStep(rounded);
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

  stepToValue(knobValue) {
    if (knobValue === 0) return -Infinity;
    return baseMapping.stepToValue(knobValue);
  },

  valueToStep(value) {
    if (value === -Infinity) return 0;
    return baseMapping.valueToStep(value);
  },
});

// --- Specialized mappings ---

/**
 * Pitch mapping with semitone quantization.
 * Maps knob values to frequencies, quantized to whole semitones.
 * Center (50) = no pitch change, ±24 semitones range.
 */
export const pitchMapping: ParamMapping<number> = {
  stepCount: 48, // 48 discrete positions for fine semitone control
  defaultStep: 50, // Center = base frequency

  stepToValue(knobValue) {
    const clamped = clamp(knobValue);
    // Map to [-1, 1] range centered at 50
    const normalized = (clamped - 50) / 50;
    // Convert to semitones and round to whole numbers
    const semitoneOffsetRaw = normalized * INSTRUMENT_PITCH_SEMITONE_RANGE;
    const semitoneOffset = Math.round(semitoneOffsetRaw);
    // Convert semitones to frequency ratio
    const ratio = Math.pow(2, semitoneOffset / 12);
    return INSTRUMENT_PITCH_BASE_FREQUENCY * ratio;
  },

  valueToStep(frequency) {
    // Convert frequency back to semitone offset
    const ratio = frequency / INSTRUMENT_PITCH_BASE_FREQUENCY;
    const semitoneOffset = Math.log2(ratio) * 12;
    // Clamp to valid semitone range
    const clamped = Math.max(
      -INSTRUMENT_PITCH_SEMITONE_RANGE,
      Math.min(INSTRUMENT_PITCH_SEMITONE_RANGE, semitoneOffset),
    );
    // Map back to knob value [0, 100]
    const normalized = clamped / INSTRUMENT_PITCH_SEMITONE_RANGE;
    const knobValue = normalized * 50 + 50;
    return Math.min(100, Math.max(0, Math.round(knobValue)));
  },

  format(_frequency, knobValue) {
    // Calculate display semitone offset
    const normalized = (knobValue - 50) / 50;
    const semitoneOffsetRaw = normalized * INSTRUMENT_PITCH_SEMITONE_RANGE;
    const semitoneOffset = Math.round(semitoneOffsetRaw);
    return formatDisplayPitchSemitone(semitoneOffset);
  },
};

/**
 * Split filter mapping with mode switching.
 * Left half (0-49) = Low-pass filter
 * Right half (50-100) = High-pass filter
 */
export const splitFilterMapping: ParamMapping<number> = {
  stepCount: KNOB_STEP_MAX,
  defaultStep: KNOB_STEP_DEFAULT,

  stepToValue: (knobValue) =>
    transformKnobValueSplitFilter(
      knobValue,
      MASTER_FILTER_RANGE,
      MASTER_FILTER_RANGE,
    ),

  valueToStep: () => {
    throw new Error("valueToStep not implemented for split filter");
  },

  format: (freq, knobValue) => {
    const modeLabel = knobValue <= KNOB_ROTATION_THRESHOLD_L ? "LP" : "HP";
    const displayValue =
      freq < 1000 ? freq.toFixed(0) : (freq / 1000).toFixed(2);
    return { value: displayValue, append: modeLabel };
  },
};

// --- Instrument parameter mappings ---

/**
 * Attack envelope time (exponential for natural feel)
 */
export const attackMapping = makeExponentialMapping(
  INSTRUMENT_ATTACK_RANGE,
  formatDisplayAttackDuration,
);

/**
 * Release envelope time (exponential for natural feel)
 */
export const releaseMapping = makeExponentialMapping(
  INSTRUMENT_RELEASE_RANGE,
  formatDisplayReleaseDuration,
);

/**
 * Instrument volume with -∞ at position 0
 */
export const instrumentVolumeMapping = withInfinityAtZero(
  makeLinearMapping(INSTRUMENT_VOLUME_RANGE, formatDisplayVolume, 100, 92),
);

/**
 * Stereo panning (0% = left, 50% = center, 100% = right)
 */
export const panMapping = makeLinearMapping(
  INSTRUMENT_PAN_RANGE,
  formatDisplayPercentage,
);

// --- Master / FX parameter mappings ---

/**
 * Master output volume with -∞ at position 0
 */
export const masterVolumeMapping = withInfinityAtZero(
  makeLinearMapping(MASTER_VOLUME_RANGE, formatDisplayVolume, 100, 92),
);

/**
 * Low-pass filter cutoff frequency (exponential)
 */
export const lowPassFilterMapping = makeExponentialMapping(
  MASTER_FILTER_RANGE,
  formatDisplayFilter,
);

/**
 * High-pass filter cutoff frequency (exponential)
 */
export const highPassFilterMapping = makeExponentialMapping(
  MASTER_FILTER_RANGE,
  formatDisplayFilter,
);

/**
 * Phaser effect wet/dry mix (0-100%)
 */
export const phaserWetMapping = makeLinearMapping(
  MASTER_PHASER_WET_RANGE,
  formatDisplayPercentage,
);

/**
 * Reverb effect wet/dry mix (0-100%)
 */
export const reverbWetMapping = makeLinearMapping(
  MASTER_REVERB_WET_RANGE,
  formatDisplayPercentage,
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
);

/**
 * Compressor ratio with integer quantization (1:1, 2:1, ... 8:1)
 */
export const compRatioMapping = withIntegerQuantization(
  makeLinearMapping(MASTER_COMP_RATIO_RANGE, formatDisplayCompRatio, 8),
);

/**
 * Compressor parallel mix (0-100%)
 */
export const compMixMapping = makeLinearMapping(
  MASTER_COMP_MIX_RANGE,
  formatDisplayPercentage,
);
