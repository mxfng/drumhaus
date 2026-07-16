/**
 * Canonical-unit descriptors for the scalar parameters. Each speaks the
 * canonical unit the app stores and the engine hears: seconds, dB, a -1..1 pan,
 * semitone offset, 0..1 macro fractions, and the Tone swing fraction.
 *
 * These are the LIVE descriptors the controls render from post-flip (the old
 * src/shared/knob 0-100 mappings they were ported from have been removed).
 * They are `ParamDescriptor<number>`.
 */

import {
  INSTRUMENT_DECAY_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_TUNE_SEMITONE_RANGE,
  INSTRUMENT_VOLUME_RANGE,
  MASTER_COMP_ATTACK_DEFAULT,
  MASTER_COMP_ATTACK_RANGE,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_WET_RANGE,
  MASTER_SATURATION_WET_RANGE,
  MASTER_VOLUME_RANGE,
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_MAX,
} from "@/core/audio/engine/constants";
import { clamp01 } from "../lib/taper";
import type { ParamDescriptor, Taper } from "../types";

/**
 * Skew equivalent to the legacy `t^2` exponential knob curve. The legacy
 * forward map is `value = lerp(t^power, ...)`; JUCE's inverse skew relates by
 * `skew = 1 / power`, so a power-2 curve is `skew = 0.5`.
 */
const LEGACY_EXP_SKEW = 0.5;

// --- Formatting / parsing helpers ---

function parseNumber(text: string): number | null {
  const match = text.replace(",", ".").match(/-?\d*\.?\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function formatDb(value: number): string {
  // -∞ is true silence only; the -46 dB floor is a real, displayable value.
  if (value === -Infinity) return "-∞ dB";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} dB`;
}

function parseDb(text: string): number | null {
  if (/[-−]?\s*(∞|inf)/i.test(text)) return -Infinity;
  return parseNumber(text);
}

/**
 * Volume taper: position 0 is true silence (-Infinity dB); positions above 0
 * map linearly across the finite [floorDb, ceilDb] display range. This restores
 * the legacy `withInfinityAtZero` behavior so a fader dragged fully down is real
 * silence rather than the -46 dB floor. The descriptor's `min` is the finite
 * floor (`floorDb`), so type-in of a sub-floor value clamps up to it rather than
 * committing a value the document schema rejects; the -Infinity silence sentinel
 * rides below that floor and is preserved by `clampValue`.
 */
function volumeTaper(range: readonly [number, number]): Taper<number> {
  const [floorDb, ceilDb] = range;
  const span = ceilDb - floorDb;
  return {
    kind: "custom",
    to01: (db) => (db === -Infinity ? 0 : clamp01((db - floorDb) / span)),
    from01: (position) =>
      position <= 0 ? -Infinity : floorDb + position * span,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function parsePercent(text: string): number | null {
  const n = parseNumber(text);
  return n === null ? null : n / 100;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 ms";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 10) return `${seconds.toFixed(2)} s`;
  return `${seconds.toFixed(1)} s`;
}

function parseDuration(text: string): number | null {
  const n = parseNumber(text);
  if (n === null) return null;
  return /ms/i.test(text) ? n / 1000 : n;
}

// --- Instrument descriptors ---

const instrumentDecayDescriptor: ParamDescriptor<number> = {
  min: INSTRUMENT_DECAY_RANGE[0],
  max: INSTRUMENT_DECAY_RANGE[1],
  taper: { kind: "exponential", skew: LEGACY_EXP_SKEW },
  default: INSTRUMENT_DECAY_RANGE[1],
  unit: "s",
  format: formatDuration,
  parse: parseDuration,
};

const instrumentVolumeDescriptor: ParamDescriptor<number> = {
  min: INSTRUMENT_VOLUME_RANGE[0],
  max: INSTRUMENT_VOLUME_RANGE[1],
  taper: volumeTaper(INSTRUMENT_VOLUME_RANGE),
  default: 0,
  unit: "dB",
  format: formatDb,
  parse: parseDb,
};

const instrumentPanDescriptor: ParamDescriptor<number> = {
  min: INSTRUMENT_PAN_RANGE[0],
  max: INSTRUMENT_PAN_RANGE[1],
  taper: { kind: "linear" },
  default: 0,
  polarity: "bipolar",
  detents: [{ value: 0, radiusPct: 0.05 }],
  format: formatPan,
  parse: parsePan,
};

const instrumentTuneDescriptor: ParamDescriptor<number> = {
  min: -INSTRUMENT_TUNE_SEMITONE_RANGE,
  max: INSTRUMENT_TUNE_SEMITONE_RANGE,
  taper: { kind: "linear" },
  default: 0,
  polarity: "bipolar",
  unit: "st",
  detents: [{ value: 0, radiusPct: 0.05 }],
  format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} st`,
  parse: parseNumber,
};

function formatPan(value: number): string {
  if (Math.abs(value) < 0.005) return "C";
  const side = value < 0 ? "L" : "R";
  return `${side}${Math.round(Math.abs(value) * 100)}`;
}

function parsePan(text: string): number | null {
  const t = text.trim().toUpperCase();
  if (t.startsWith("C")) return 0;
  const n = parseNumber(t);
  if (n === null) return null;
  if (t.startsWith("L")) return -Math.abs(n) / 100;
  if (t.startsWith("R")) return Math.abs(n) / 100;
  return Math.abs(n) <= 1 ? n : n / 100;
}

// --- Master descriptors (nine params; `filter` is the generic-T descriptor) ---

const masterVolumeDescriptor: ParamDescriptor<number> = {
  min: MASTER_VOLUME_RANGE[0],
  max: MASTER_VOLUME_RANGE[1],
  taper: volumeTaper(MASTER_VOLUME_RANGE),
  default: 0,
  unit: "dB",
  format: formatDb,
  parse: parseDb,
};

const masterSaturationDescriptor: ParamDescriptor<number> = {
  min: MASTER_SATURATION_WET_RANGE[0],
  max: MASTER_SATURATION_WET_RANGE[1],
  taper: { kind: "linear" },
  default: 0,
  format: formatPercent,
  parse: parsePercent,
};

const masterPhaserDescriptor: ParamDescriptor<number> = {
  min: MASTER_PHASER_WET_RANGE[0],
  max: MASTER_PHASER_WET_RANGE[1],
  taper: { kind: "linear" },
  default: 0,
  format: formatPercent,
  parse: parsePercent,
};

const masterReverbDescriptor: ParamDescriptor<number> = {
  min: MASTER_REVERB_WET_RANGE[0],
  max: MASTER_REVERB_WET_RANGE[1],
  taper: { kind: "linear" },
  default: 0,
  format: formatPercent,
  parse: parsePercent,
};

const masterCompThresholdDescriptor: ParamDescriptor<number> = {
  min: MASTER_COMP_THRESHOLD_RANGE[0],
  max: MASTER_COMP_THRESHOLD_RANGE[1],
  taper: { kind: "linear" },
  default: 0,
  unit: "dB",
  format: (v) => `${v.toFixed(1)} dB`,
  parse: parseNumber,
};

const masterCompRatioDescriptor: ParamDescriptor<number> = {
  min: MASTER_COMP_RATIO_RANGE[0],
  max: MASTER_COMP_RATIO_RANGE[1],
  taper: { kind: "linear" },
  // Matches the shipped init/store default so double-click reset never dirties
  // a factory-fresh preset (see the descriptor drift-guard test).
  default: 5,
  interval: 1,
  format: (v) => `${Math.round(v)}:1`,
  parse: parseNumber,
};

const masterCompAttackDescriptor: ParamDescriptor<number> = {
  min: MASTER_COMP_ATTACK_RANGE[0],
  max: MASTER_COMP_ATTACK_RANGE[1],
  taper: { kind: "exponential", skew: LEGACY_EXP_SKEW },
  // Shared with the init/store default (the migrated legacy knob-50 value) so
  // reset lands on the factory value byte-for-byte and never dirties it.
  default: MASTER_COMP_ATTACK_DEFAULT,
  unit: "ms",
  format: (v) => `${(v * 1000).toFixed(v < 0.01 ? 1 : 0)} ms`,
  parse: (t) => {
    const n = parseNumber(t);
    return n === null ? null : n / 1000;
  },
};

const masterCompMixDescriptor: ParamDescriptor<number> = {
  min: MASTER_COMP_MIX_RANGE[0],
  max: MASTER_COMP_MIX_RANGE[1],
  taper: { kind: "linear" },
  default: 0.7,
  format: formatPercent,
  parse: parsePercent,
};

// --- Transport ---

/**
 * Swing as the canonical Tone.Transport swing fraction (0..0.375). Display is
 * MPC swing percent: MPC% = 50 + (100/3) * swing, so 0 -> 50.0%, 0.375 -> 62.5%.
 */
const MPC_PER_SWING = 100 / 3;

const transportSwingDescriptor: ParamDescriptor<number> = {
  min: 0,
  max: TRANSPORT_SWING_MAX,
  taper: { kind: "linear" },
  default: 0,
  // Finer than the general knob feel: swing is a precision screen-bar control
  // you land on exact values with. Mirrors the old ClickableValue swing feel
  // (finer than bpm), normalized against the canonical range.
  dragSensitivity: 0.0008,
  format: (swing) => {
    const mpc = 50 + MPC_PER_SWING * swing;
    return `${mpc.toFixed(1).replace(/\.0$/, "")}%`;
  },
  parse: (text) => {
    const n = parseNumber(text);
    if (n === null) return null;
    return (n - 50) / MPC_PER_SWING;
  },
};

/**
 * Tempo in BPM: the canonical value the store and engine already hold. Linear,
 * integer-stepped over the app's tempo range.
 */
const transportBpmDescriptor: ParamDescriptor<number> = {
  min: TRANSPORT_BPM_RANGE[0],
  max: TRANSPORT_BPM_RANGE[1],
  taper: { kind: "linear" },
  // Matches the shipped init/store default (100 bpm) so reset never dirties a
  // factory-fresh preset.
  default: 100,
  interval: 1,
  // Finer than the general knob feel: bpm is a precision screen-bar control.
  // The old ClickableValue moved ~0.3 bpm/px; over the ~260 bpm span that is
  // ~0.00115 in normalized units per pixel.
  dragSensitivity: 0.0012,
  unit: "bpm",
  format: (bpm) => `${Math.round(bpm)}`,
  parse: parseNumber,
};

export {
  LEGACY_EXP_SKEW,
  transportBpmDescriptor,
  instrumentDecayDescriptor,
  instrumentVolumeDescriptor,
  instrumentPanDescriptor,
  instrumentTuneDescriptor,
  masterVolumeDescriptor,
  masterSaturationDescriptor,
  masterPhaserDescriptor,
  masterReverbDescriptor,
  masterCompThresholdDescriptor,
  masterCompRatioDescriptor,
  masterCompAttackDescriptor,
  masterCompMixDescriptor,
  transportSwingDescriptor,
};
