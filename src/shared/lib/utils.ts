import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Clamps a value between a minimum and maximum bound.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a value from a range [min, max] to [0, 1].
 */
function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

/**
 * Normalize to bipolar range [-1, 1] from a centered range.
 * Maps [center - range, center + range] to [-1, 1] where center maps to 0.
 */
function normalizeCentered(
  value: number,
  center: number,
  range: number,
): number {
  return (value - center) / range;
}

/**
 * Linear interpolation: map a normalized value [0, 1] to a range [min, max].
 * Also known as "lerp" or "denormalize".
 */
function lerp(t: number, min: number, max: number): number {
  return min + t * (max - min);
}

/**
 * Quantize a value to a resolution.
 *
 * Converts twitchy human-interaction signal values to a more stable, quantized value for a dignified audio engine.
 */
const quantize = (value: number, resolution: number): number => {
  const normalizedStep = resolution > 0 ? resolution : 1;
  return Math.round(value / normalizedStep) * normalizedStep;
};

export { cn, clamp, normalize, normalizeCentered, lerp, quantize };
