// Legacy-read island: the old 0-100 swing knob range, frozen here (it no
// longer exists in the engine). Swing is canonical everywhere born after the
// flip; this migrator only ever sees pre-retune knob values.
const LEGACY_SWING_KNOB_RANGE: [number, number] = [0, 100];

/**
 * Migration for swing knob values persisted before the #269 swing retune.
 *
 * Swing is persisted in KNOB space (0-100) everywhere (.dh files, share
 * URLs, localStorage), so retuning the knob curve reinterprets every stored
 * value. Pre-retune the knob mapped linearly onto Tone swing 0-0.5
 * (s = k / 200); the retune lowered the ceiling to the TR-909's maximum
 * shuffle, TRANSPORT_SWING_MAX = 0.375 (s = k * 0.00375). The
 * feel-preserving conversion is therefore
 *
 *   k_new = k_old * (1/200) / (3/800) = k_old * 4/3
 *
 * Old values above 75 (Tone swing beyond the new 0.375 ceiling) clamp to
 * knob 100 - an accepted trade-off of the retune (#269).
 */
function migrateLegacySwingKnob(swing: number): number {
  if (!Number.isFinite(swing)) return TRANSPORT_SWING_RANGE[0];
  // (swing * 4) / 3 rather than swing * (4 / 3): the numerator is exact in
  // floating point, so shipped integer values migrate without float noise
  // (48 -> 64, 75 -> 100).
  const migrated = (swing * 4) / 3;
  return Math.min(
    TRANSPORT_SWING_RANGE[1],
    Math.max(TRANSPORT_SWING_RANGE[0], migrated),
  );
}

export { migrateLegacySwingKnob };
