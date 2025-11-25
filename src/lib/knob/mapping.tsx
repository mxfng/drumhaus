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

// --- General mapping creators ---

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
    stepToValue: (step) => {
      const clamped = clampStep(step, stepCount);
      const t = clamped / stepCount; // 0..1
      return min + t * (max - min);
    },

    valueToStep: (value) => {
      if (value <= min) return 0;
      if (value >= max) return stepCount;
      const t = (value - min) / (max - min);
      return clampStep(Math.round(t * stepCount), stepCount);
    },

    format,
  };
};

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
    stepToValue: (step) => {
      const t = step / stepCount; // 0..1
      const e = Math.pow(t, curvePower);
      return min + e * (max - min);
    },

    valueToStep: (value) => {
      if (value <= min) return 0;
      if (value >= max) return stepCount;

      const normalized = (value - min) / (max - min); // 0..1
      const t = Math.pow(normalized, 1 / curvePower);
      return clampStep(Math.round(t * stepCount), stepCount);
    },

    format,
  };
};

// --- Mappings ---

export const attackMapping = makeExponentialMapping(
  INSTRUMENT_ATTACK_RANGE,
  formatDisplayAttackDuration,
);

export const releaseMapping = makeExponentialMapping(
  INSTRUMENT_RELEASE_RANGE,
  formatDisplayReleaseDuration,
);

const basePitchMapping = makeLinearMapping(
  [-INSTRUMENT_PITCH_SEMITONE_RANGE, INSTRUMENT_PITCH_SEMITONE_RANGE],
  formatDisplayPitchSemitone,
  48,
  24,
);

export const pitchMapping: ParamMapping<number> = {
  ...basePitchMapping,

  stepToValue(step) {
    // Defensive: clamp step to valid range [0, stepCount]
    const clampedStep = clampStep(step, basePitchMapping.stepCount);
    const semitoneOffset = basePitchMapping.stepToValue(clampedStep);

    // Convert semitone offset to frequency
    const ratio = Math.pow(2, semitoneOffset / 12);
    const frequency = INSTRUMENT_PITCH_BASE_FREQUENCY * ratio;

    console.debug("pitchMapping.stepToValue", {
      step,
      clampedStep,
      semitoneOffset,
      frequency,
    });
    return frequency;
  },

  valueToStep(frequency) {
    // Convert frequency back to semitone offset
    const ratio = frequency / INSTRUMENT_PITCH_BASE_FREQUENCY;
    const semitoneOffset = Math.log2(ratio) * 12;
    // clamp to valid range first so you don't blow past [-R,R]
    const clamped = Math.max(
      -INSTRUMENT_PITCH_SEMITONE_RANGE,
      Math.min(INSTRUMENT_PITCH_SEMITONE_RANGE, semitoneOffset),
    );
    return basePitchMapping.valueToStep(clamped);
  },

  format: basePitchMapping.format,
};

const baseInstrumentVolumeMapping = makeLinearMapping(
  INSTRUMENT_VOLUME_RANGE,
  formatDisplayVolume,
  100,
  92,
);

export const instrumentVolumeMapping: ParamMapping<number> = {
  stepCount: baseInstrumentVolumeMapping.stepCount,
  defaultStep: baseInstrumentVolumeMapping.defaultStep,
  stepToValue: (step) => {
    if (step === 0) return -Infinity;
    return baseInstrumentVolumeMapping.stepToValue(step);
  },
  valueToStep: (value) => {
    if (value === -Infinity) return 0;
    return baseInstrumentVolumeMapping.valueToStep(value);
  },
  format: baseInstrumentVolumeMapping.format,
};

const baseMasterVolumeMapping = makeLinearMapping(
  MASTER_VOLUME_RANGE,
  formatDisplayVolume,
  100,
  92,
);

export const masterVolumeMapping: ParamMapping<number> = {
  ...baseMasterVolumeMapping,

  stepToValue: (step) => {
    if (step === 0) return -Infinity;
    return baseMasterVolumeMapping.stepToValue(step);
  },

  valueToStep: (value) => {
    if (value === -Infinity) return 0;
    return baseMasterVolumeMapping.valueToStep(value);
  },

  format: baseMasterVolumeMapping.format,
};

export const lowPassFilterMapping = makeExponentialMapping(
  MASTER_FILTER_RANGE,
  formatDisplayFilter,
);

export const highPassFilterMapping = makeExponentialMapping(
  MASTER_FILTER_RANGE,
  formatDisplayFilter,
);

export const phaserWetMapping = makeLinearMapping(
  MASTER_PHASER_WET_RANGE,
  formatDisplayPercentage,
);

export const reverbWetMapping = makeLinearMapping(
  MASTER_REVERB_WET_RANGE,
  formatDisplayPercentage,
);

export const reverbDecayMapping = makeLinearMapping(
  MASTER_REVERB_DECAY_RANGE,
  formatDisplayPercentage,
);

export const compThresholdMapping = makeLinearMapping(
  MASTER_COMP_THRESHOLD_RANGE,
  formatDisplayVolumeMaster,
);

export const compRatioMapping = makeLinearMapping(
  MASTER_COMP_RATIO_RANGE,
  formatDisplayCompRatio,
  8,
);

export const compMixMapping = makeLinearMapping(
  MASTER_COMP_MIX_RANGE,
  formatDisplayPercentage,
);

export const panMapping = makeLinearMapping(
  INSTRUMENT_PAN_RANGE,
  formatDisplayPercentage,
);

export const splitFilterMapping: ParamMapping<number> = {
  stepCount: KNOB_STEP_MAX,

  defaultStep: KNOB_STEP_DEFAULT,

  stepToValue: (step) =>
    transformKnobValueSplitFilter(
      step,
      MASTER_FILTER_RANGE,
      MASTER_FILTER_RANGE,
    ),

  valueToStep: () => {
    throw new Error("valueToStep not implemented for split filter");
  },

  format: (freq, step) => {
    const modeLabel = step <= KNOB_ROTATION_THRESHOLD_L ? "LP" : "HP";

    return {
      value: freq < 1000 ? freq.toFixed(0) : (freq / 1000).toFixed(2), // or reuse duration-esque helper
      append: modeLabel,
    };
  },
};

// --- Helpers ---

/**
 * Clamp a step value to the step count.
 */
export const clampStep = (s: number, stepCount: number) =>
  Math.min(stepCount, Math.max(0, s));
