import { clamp } from "@/shared/lib/utils";
import type { Taper } from "../types";

/** Clamp a raw position into the normalized [0, 1] transport range. */
function clamp01(position: number): number {
  return clamp(position, 0, 1);
}

/**
 * Derive the JUCE-style skew exponent that places `centre` at knob-centre
 * (normalized position 0.5).
 *
 * With the non-symmetric skew, `to01(centre) = proportion ^ skew`, so
 * `skew = ln(0.5) / ln(proportion)` where `proportion` is `centre`'s linear
 * position. Lets an author say "1 kHz sits at knob-centre" instead of scattering
 * magic exponents (see docs/knob-primitive.md).
 */
function setSkewForCentre(min: number, max: number, centre: number): number {
  const proportion = (centre - min) / (max - min);
  if (proportion <= 0 || proportion >= 1) {
    throw new Error(
      `setSkewForCentre: centre ${centre} must lie strictly inside (${min}, ${max})`,
    );
  }
  return Math.log(0.5) / Math.log(proportion);
}

/**
 * Apply a skew to a linear proportion (JUCE NormalisableRange, forward).
 * With `symmetric`, the skew is applied from the middle outward so the centre
 * stays pinned at 0.5 (used by bipolar params: pan, tune).
 */
function skewProportionTo01(
  proportion: number,
  skew: number,
  symmetric: boolean,
): number {
  const p = clamp01(proportion);
  if (skew === 1) return p;
  if (!symmetric) return Math.pow(p, skew);

  const distanceFromMiddle = 2 * p - 1;
  const skewed =
    Math.sign(distanceFromMiddle) *
    Math.pow(Math.abs(distanceFromMiddle), skew);
  return (1 + skewed) / 2;
}

/**
 * Invert a skew back to a linear proportion (JUCE NormalisableRange, inverse).
 */
function skewProportionFrom01(
  position: number,
  skew: number,
  symmetric: boolean,
): number {
  const p = clamp01(position);
  if (skew === 1) return p;
  if (!symmetric) {
    return p > 0 ? Math.exp(Math.log(p) / skew) : p;
  }

  let distanceFromMiddle = 2 * p - 1;
  if (distanceFromMiddle !== 0) {
    distanceFromMiddle =
      Math.sign(distanceFromMiddle) *
      Math.exp(Math.log(Math.abs(distanceFromMiddle)) / skew);
  }
  return (distanceFromMiddle + 1) / 2;
}

/** Canonical value -> normalized [0, 1] position, via the descriptor's taper. */
function taperToNormalized<T>(
  taper: Taper<T>,
  value: T,
  min: T,
  max: T,
): number {
  if (taper.kind === "custom") return clamp01(taper.to01(value));

  const v = value as unknown as number;
  const lo = min as unknown as number;
  const hi = max as unknown as number;
  const proportion = clamp01((v - lo) / (hi - lo));

  if (taper.kind === "linear") return proportion;
  return skewProportionTo01(proportion, taper.skew, taper.symmetric ?? false);
}

/** Normalized [0, 1] position -> canonical value, via the descriptor's taper. */
function taperFromNormalized<T>(
  taper: Taper<T>,
  position: number,
  min: T,
  max: T,
): T {
  if (taper.kind === "custom") return taper.from01(clamp01(position));

  const lo = min as unknown as number;
  const hi = max as unknown as number;

  let proportion = clamp01(position);
  if (taper.kind === "exponential") {
    proportion = skewProportionFrom01(
      proportion,
      taper.skew,
      taper.symmetric ?? false,
    );
  }
  return (lo + (hi - lo) * proportion) as unknown as T;
}

export {
  clamp01,
  setSkewForCentre,
  skewProportionTo01,
  skewProportionFrom01,
  taperToNormalized,
  taperFromNormalized,
};
