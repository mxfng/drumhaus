/**
 * Pure geometry for the night sky's near-plane dissolve. Kept free of
 * canvas/React so the fade curve is unit-testable.
 */

/**
 * Width of the near-plane dissolve band, in z units. Stars fade out as z
 * falls from (band - fov) to -fov instead of being hard-culled: the old
 * cut let scale = fov / (fov + z) balloon a star right up to the plane and
 * then drop it in a single frame - a visible pop during rotation. The band
 * also caps the projection scale (fov / band at the band edge), so a
 * dissolving star stops growing while it fades.
 */
const NEAR_FADE_BAND = 0.5;

/**
 * Near-plane fade factor (0..1) for a star at depth z under the given
 * projection fov: 1 at and beyond the band, easing smoothly to 0 at the
 * near plane (smoothstep, so the dissolve has no visible corner). Returns
 * 0 for anything at or behind the plane.
 */
function nearPlaneFade(z: number, fov: number): number {
  const t = (z + fov) / NEAR_FADE_BAND;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/**
 * The maximum projection scale, reached at the near edge of the fade band.
 * Clamping to this keeps dissolving stars from ballooning: beyond the band
 * they only fade.
 */
function nearScaleCap(fov: number): number {
  return fov / NEAR_FADE_BAND;
}

export { NEAR_FADE_BAND, nearPlaneFade, nearScaleCap };
