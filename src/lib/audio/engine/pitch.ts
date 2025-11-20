import {
  INSTRUMENT_PITCH_BASE_FREQUENCY,
  INSTRUMENT_PITCH_SEMITONE_RANGE,
} from "./constants";

export const PITCH_KNOB_STEP = 100 / (INSTRUMENT_PITCH_SEMITONE_RANGE * 2); // 100 points across ±range

export const transformPitchKnobToFrequency = (
  knobValue: number,
  baseFrequency: number = INSTRUMENT_PITCH_BASE_FREQUENCY,
  semitoneRange: number = INSTRUMENT_PITCH_SEMITONE_RANGE,
): number => {
  const clampedValue = Math.min(100, Math.max(0, knobValue));
  const normalized = (clampedValue - 50) / 50; // -1..1 relative to center
  const semitoneOffset = normalized * semitoneRange;
  const ratio = Math.pow(2, semitoneOffset / 12);
  return baseFrequency * ratio;
};
