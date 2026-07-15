import { describe, expect, it } from "vitest";

import { migrateLegacySwingKnob } from "./legacy-swing";

/**
 * Feel-preserving property of the #269 swing retune: the migrated knob
 * value must produce the same Tone swing under the new curve (k * 0.00375)
 * as the original did under the old curve (k / 200), up to the new 0.375
 * ceiling.
 */
describe("migrateLegacySwingKnob", () => {
  it("keeps straight time at 0", () => {
    expect(migrateLegacySwingKnob(0)).toBe(0);
  });

  it("migrates the shipped default-preset values exactly", () => {
    // A Drum Called Haus
    expect(migrateLegacySwingKnob(48)).toBe(64);
    // Sunflower
    expect(migrateLegacySwingKnob(15)).toBe(20);
    // Slime Time (152 / 3, non-terminating)
    expect(migrateLegacySwingKnob(38)).toBeCloseTo(152 / 3, 12);
  });

  it("maps the exact boundary 75 (old Tone swing 0.375) to knob 100", () => {
    expect(migrateLegacySwingKnob(75)).toBe(100);
  });

  it("clamps old values above 75 (old Tone swing beyond 0.375) to 100", () => {
    expect(migrateLegacySwingKnob(76)).toBe(100);
    expect(migrateLegacySwingKnob(100)).toBe(100);
  });

  it("preserves the Tone swing feel for every value at or below 75", () => {
    for (let k = 0; k <= 75; k++) {
      const oldToneSwing = k / 200;
      const newToneSwing = migrateLegacySwingKnob(k) * 0.00375;
      expect(newToneSwing).toBeCloseTo(oldToneSwing, 12);
    }
  });

  it("defends against corrupt persisted values", () => {
    expect(migrateLegacySwingKnob(Number.NaN)).toBe(0);
    expect(migrateLegacySwingKnob(Number.POSITIVE_INFINITY)).toBe(0);
    expect(migrateLegacySwingKnob(-10)).toBe(0);
  });
});
