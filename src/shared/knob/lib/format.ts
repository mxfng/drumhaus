import {
  INSTRUMENT_VOLUME_RANGE,
  MASTER_VOLUME_RANGE,
} from "@/core/audio/engine/constants";
import { KNOB_ROTATION_THRESHOLD_L } from "./transform";

export const formatDisplayVolumeMaster = (value: number) => {
  return formatDisplayVolume(value, MASTER_VOLUME_RANGE[0]);
};

export const formatDisplayVolumeInstrument = (value: number) => {
  return formatDisplayVolume(value, INSTRUMENT_VOLUME_RANGE[0]);
};

export const formatDisplayTuneSemitone = (semitoneOffset: number) => ({
  value: (semitoneOffset > 0 ? "+" : "") + semitoneOffset.toFixed(1),
  append: "st",
});

export const formatDisplayDecayDuration = (value: number) => {
  return formatDisplayDuration(value);
};

export const formatDisplayFilter = (value: number) => {
  return { value: value.toFixed(0), append: "Hz" };
};

export const formatDisplayBpm = (value: number) => {
  return { value: value.toFixed(0), append: "bpm" };
};

export const formatDisplaySplitFilter = (value: number) => {
  const modeLabel = value <= KNOB_ROTATION_THRESHOLD_L ? "LP" : "HP";

  return { value: value.toFixed(), append: `Hz ${modeLabel}F` };
};

export const formatDisplayPercentage = (value: number) => {
  return { value: `${(value * 100).toFixed(0)}`, append: "%" };
};

export const formatDisplayPercentageValue = (value: number) => {
  return { value: value.toFixed(0), append: "%" };
};

export const formatDisplayCompRatio = (value: number) => {
  return { value: value.toFixed(0), append: ": 1" };
};

// --- Private helper functions ---

const formatDisplayVolume = (value: number, rangeMin: number) => {
  if (value <= rangeMin) {
    return { value: "-∞", append: "dB" };
  }

  return { value: (value > 0 ? "+" : "") + value.toFixed(1), append: "dB" };
};

const formatDisplayDuration = (seconds: number) => {
  if (!seconds || !Number.isFinite(seconds))
    return { value: "0", append: "ms" };
  if (seconds < 1)
    return { value: `${Math.round(seconds * 1000)}`, append: "ms" };
  if (seconds < 10) return { value: `${seconds.toFixed(2)}`, append: "s" };
  return { value: `${seconds.toFixed(1)}`, append: "s" };
};
