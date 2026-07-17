/**
 * Internal math helpers. Private to the package - consumers keep their own
 * copies of these one-liners rather than importing them from a control layer.
 */

/**
 * Clamps a value between a minimum and maximum bound.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export { clamp };
