import { describe, expect, it } from "vitest";

import { NEAR_FADE_BAND, nearPlaneFade, nearScaleCap } from "./star-field";

const FOV = 2;

describe("nearPlaneFade", () => {
  it("is fully opaque at and beyond the fade band", () => {
    expect(nearPlaneFade(-FOV + NEAR_FADE_BAND, FOV)).toBe(1);
    expect(nearPlaneFade(0, FOV)).toBe(1);
    expect(nearPlaneFade(5, FOV)).toBe(1);
  });

  it("is fully transparent at and behind the near plane", () => {
    expect(nearPlaneFade(-FOV, FOV)).toBe(0);
    expect(nearPlaneFade(-FOV - 1, FOV)).toBe(0);
  });

  it("passes the midpoint at half opacity (smoothstep symmetry)", () => {
    expect(nearPlaneFade(-FOV + NEAR_FADE_BAND / 2, FOV)).toBeCloseTo(0.5, 5);
  });

  it("decreases monotonically toward the plane with no visible corner", () => {
    let previous = 1;
    for (let i = 1; i <= 20; i++) {
      const z = -FOV + NEAR_FADE_BAND * (1 - i / 20);
      const fade = nearPlaneFade(z, FOV);
      expect(fade).toBeLessThan(previous);
      previous = fade;
    }
    expect(previous).toBe(0);
  });

  it("eases at the band edges (smoothstep, near-zero slope)", () => {
    const step = NEAR_FADE_BAND / 1000;
    const nearEdge = nearPlaneFade(-FOV + step, FOV);
    const farEdge = 1 - nearPlaneFade(-FOV + NEAR_FADE_BAND - step, FOV);
    // A linear ramp would move 0.001 per step; smoothstep moves ~0.
    expect(nearEdge).toBeLessThan(0.0001);
    expect(farEdge).toBeLessThan(0.0001);
  });
});

describe("nearScaleCap", () => {
  it("equals the projection scale at the near edge of the band", () => {
    // scale(z) = fov / (fov + z) evaluated at z = band - fov.
    expect(nearScaleCap(FOV)).toBeCloseTo(FOV / NEAR_FADE_BAND, 10);
  });

  it("caps the otherwise unbounded near-plane blowup", () => {
    const zNearPlane = -FOV + 0.001;
    const rawScale = FOV / (FOV + zNearPlane);
    expect(rawScale).toBeGreaterThan(nearScaleCap(FOV) * 100);
  });
});
