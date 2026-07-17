import type { ParamDescriptor } from "../types";
import { clamp } from "./math";
import { clamp01, taperFromNormalized, taperToNormalized } from "./taper";

/**
 * Default interaction tuning, used when a descriptor omits a field.
 *
 * Drag: normalized units per pixel, so ~300px of travel for a full sweep.
 * DAW/soft-synth knobs sit around 250-400px per sweep, and hardware-emulation
 * UIs lean toward the slower end because the knobs are visually small and
 * precision matters more than speed (#403). The rotary knob and linear fader
 * default to this same feel at the instance level (rotary-knob.tsx,
 * linear-slider.tsx); the screen-bar value fields override it with their own
 * tighter per-descriptor ratios (canonical-scalars.ts).
 */
const DEFAULT_DRAG_SENSITIVITY = 1 / 300;
const DEFAULT_FINE_DRAG_FACTOR = 0.25;
const DEFAULT_KEY_STEP = 0.01; // normalized, for continuous params
const DEFAULT_KEY_STEP_LARGE = 0.1; // normalized, for continuous params
const PAGE_STEP_INTERVALS = 10; // Page moves this many discrete steps

/** True when the descriptor works over plain numbers (linear/exponential taper). */
function isNumericDescriptor<T>(
  descriptor: ParamDescriptor<T>,
): descriptor is ParamDescriptor<T> & {
  min: number & T;
  max: number & T;
} {
  return typeof descriptor.min === "number";
}

/** Clamp a canonical value to [min, max] (numeric params only; no-op otherwise). */
function clampValue<T>(descriptor: ParamDescriptor<T>, value: T): T {
  if (typeof value === "number" && isNumericDescriptor(descriptor)) {
    // -Infinity is the silence sentinel (a volume fader fully down): it rides
    // below the finite floor and must survive clamping so true silence stays
    // reachable and round-trips (canonical-scalars.ts `volumeTaper`).
    if (value === -Infinity) return value as unknown as T;
    return clamp(value, descriptor.min, descriptor.max) as unknown as T;
  }
  return value;
}

/** Whether the descriptor is discrete (stepped or enumerated). */
function isDiscrete<T>(descriptor: ParamDescriptor<T>): boolean {
  return (
    (descriptor.interval !== undefined && descriptor.interval > 0) ||
    (descriptor.stepCount !== undefined && descriptor.stepCount > 1)
  );
}

/** Snap a canonical number to the descriptor's interval grid, offset from min. */
function snapToInterval<T>(
  descriptor: ParamDescriptor<T>,
  value: number,
): number {
  const { interval } = descriptor;
  if (!interval || interval <= 0 || !isNumericDescriptor(descriptor)) {
    return value;
  }
  const min = descriptor.min;
  const snapped = min + Math.round((value - min) / interval) * interval;
  return clamp(snapped, descriptor.min, descriptor.max);
}

/** Snap a normalized position to the descriptor's `stepCount` grid. */
function snapToStepCount<T>(
  descriptor: ParamDescriptor<T>,
  position: number,
): number {
  const { stepCount } = descriptor;
  if (!stepCount || stepCount < 2) return position;
  return Math.round(position * (stepCount - 1)) / (stepCount - 1);
}

/**
 * Snap a normalized position to the nearest detent within its radius. Detent
 * values are given in canonical units and projected into position space, so
 * snapping is taper-correct. Disabled under fine drag by the caller.
 */
function snapToDetents<T>(
  descriptor: ParamDescriptor<T>,
  position: number,
): number {
  if (!descriptor.detents || descriptor.detents.length === 0) return position;

  let best = position;
  let bestDistance = Infinity;
  for (const detent of descriptor.detents) {
    const detentPos = taperToNormalized(
      descriptor.taper,
      detent.value,
      descriptor.min,
      descriptor.max,
    );
    const distance = Math.abs(position - detentPos);
    if (distance <= detent.radiusPct && distance < bestDistance) {
      best = detentPos;
      bestDistance = distance;
    }
  }
  return best;
}

/** Canonical value -> normalized [0, 1] position. */
function canonicalToNormalized<T>(
  descriptor: ParamDescriptor<T>,
  value: T,
): number {
  return taperToNormalized(
    descriptor.taper,
    clampValue(descriptor, value),
    descriptor.min,
    descriptor.max,
  );
}

interface ResolveOptions {
  /** Fine drag suppresses detent snapping (docs/knob-primitive.md). */
  fine?: boolean;
}

/**
 * Normalized [0, 1] position -> canonical value, applying (in order) detent
 * snapping, stepCount quantization, the taper, interval quantization, and
 * range clamping. This is the single place a raw drag position becomes a
 * committable canonical value.
 */
function normalizedToCanonical<T>(
  descriptor: ParamDescriptor<T>,
  position: number,
  options: ResolveOptions = {},
): T {
  let p = clamp01(position);
  if (!options.fine) p = snapToDetents(descriptor, p);
  p = snapToStepCount(descriptor, p);

  let value = taperFromNormalized(
    descriptor.taper,
    p,
    descriptor.min,
    descriptor.max,
  );
  if (typeof value === "number") {
    value = snapToInterval(descriptor, value) as unknown as T;
  }
  return clampValue(descriptor, value);
}

/** The reset target (default), clamped for safety. */
function resetValue<T>(descriptor: ParamDescriptor<T>): T {
  return clampValue(descriptor, descriptor.default);
}

/**
 * The canonical value one keyboard step from `value`.
 *
 * Discrete params (interval or stepCount) move by whole steps; continuous
 * params move by `keyStep` / `keyStepLarge` in normalized space so the feel is
 * range- and taper-independent. `Home`/`End` are handled by the caller as the
 * endpoints. Stepping bypasses magnetic detents (`fine`): keyboard and wheel
 * are precise, detents are a drag-only affordance.
 */
function stepValue<T>(
  descriptor: ParamDescriptor<T>,
  value: T,
  direction: 1 | -1,
  large: boolean,
): T {
  // Discrete numeric: step by whole intervals.
  if (
    descriptor.interval &&
    descriptor.interval > 0 &&
    typeof value === "number"
  ) {
    const stepCountMultiple = large ? PAGE_STEP_INTERVALS : 1;
    const next = value + direction * descriptor.interval * stepCountMultiple;
    return normalizedToCanonical(
      descriptor,
      canonicalToNormalized(descriptor, next as unknown as T),
      { fine: true },
    );
  }

  // Discrete via stepCount: step by whole positions.
  if (descriptor.stepCount && descriptor.stepCount > 1) {
    const steps = descriptor.stepCount - 1;
    const currentPos = canonicalToNormalized(descriptor, value);
    const currentIndex = Math.round(currentPos * steps);
    const delta = large
      ? Math.max(1, Math.round(steps / PAGE_STEP_INTERVALS))
      : 1;
    const nextIndex = clamp(currentIndex + direction * delta, 0, steps);
    return normalizedToCanonical(descriptor, nextIndex / steps, { fine: true });
  }

  // Continuous: step in normalized space.
  const step = large
    ? (descriptor.keyStepLarge ?? DEFAULT_KEY_STEP_LARGE)
    : (descriptor.keyStep ?? DEFAULT_KEY_STEP);
  const nextPos = clamp01(
    canonicalToNormalized(descriptor, value) + direction * step,
  );
  return normalizedToCanonical(descriptor, nextPos, { fine: true });
}

/** The value at the requested endpoint. */
function endpointValue<T>(
  descriptor: ParamDescriptor<T>,
  end: "min" | "max",
): T {
  return normalizedToCanonical(descriptor, end === "min" ? 0 : 1);
}

/** Display string for a canonical value (pure projection). */
function formatValue<T>(descriptor: ParamDescriptor<T>, value: T): string {
  return descriptor.format(value);
}

/** Parse type-in text to a clamped canonical value, or null if rejected. */
function parseValue<T>(descriptor: ParamDescriptor<T>, text: string): T | null {
  if (!descriptor.parse) return null;
  const parsed = descriptor.parse(text);
  if (parsed === null || parsed === undefined) return null;
  return clampValue(descriptor, parsed);
}

export {
  DEFAULT_DRAG_SENSITIVITY,
  DEFAULT_FINE_DRAG_FACTOR,
  DEFAULT_KEY_STEP,
  DEFAULT_KEY_STEP_LARGE,
  isNumericDescriptor,
  isDiscrete,
  clampValue,
  canonicalToNormalized,
  normalizedToCanonical,
  resetValue,
  stepValue,
  endpointValue,
  formatValue,
  parseValue,
};
export type { ResolveOptions };
