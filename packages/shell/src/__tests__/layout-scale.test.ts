import { describe, expect, it } from "vitest";

import {
  computeFitScale,
  createLayoutScale,
  DEFAULT_SCALE_OPTIONS,
  type DesignBox,
} from "../layout-scale";

/** Drumhaus's design box, used as the reference geometry throughout. */
const DESIGN_BOX: DesignBox = {
  widthRem: 90,
  heightRem: 56.25,
  headerHeightRem: 2.5,
  footerHeightRem: 2.5,
  paddingRem: 5,
};

const viewport = (widthPx: number, heightPx: number, rootFontSizePx = 16) => ({
  widthPx,
  heightPx,
  rootFontSizePx,
});

describe("computeFitScale", () => {
  // At 16px root font the design box resolves to 1440x980 plus 80px padding.

  it("picks the largest option that does not exceed the ideal scale", () => {
    // 1280x720: width fits at 83%, height at 65% -> ideal 65% -> option 60.
    expect(
      computeFitScale(viewport(1280, 720), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(60);
  });

  it("hits an option exactly when the viewport matches it", () => {
    // 1520x1060 leaves exactly 1440x980 after padding -> ideal 100%.
    expect(
      computeFitScale(viewport(1520, 1060), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(100);
  });

  it("steps down as soon as the ideal drops below an option", () => {
    // One pixel narrower than an exact 100% fit -> ideal 99.93% -> option 90.
    expect(
      computeFitScale(viewport(1519, 1060), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(90);
  });

  it("is limited by the tighter axis", () => {
    // Very wide but short: height is the constraint.
    expect(
      computeFitScale(viewport(5000, 1060), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(100);
    expect(
      computeFitScale(viewport(5000, 720), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(60);
  });

  it("clamps to the largest option on huge viewports", () => {
    // 4000x3000 -> ideal 272% -> capped at the 200 option.
    expect(
      computeFitScale(viewport(4000, 3000), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(200);
  });

  it("falls back to the smallest option when nothing fits", () => {
    expect(
      computeFitScale(viewport(200, 200), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(50);
  });

  it("treats a degenerate viewport as a 100% ideal", () => {
    // Zero viewport: negative available space -> defensive ratio of 1.
    expect(
      computeFitScale(viewport(0, 0), DESIGN_BOX, DEFAULT_SCALE_OPTIONS),
    ).toBe(100);
    expect(
      computeFitScale(
        viewport(Number.NaN, 720),
        DESIGN_BOX,
        DEFAULT_SCALE_OPTIONS,
      ),
    ).toBe(100);
  });

  it("resolves the rem design box against the root font size", () => {
    // Same window, larger root font -> effectively smaller viewport.
    expect(
      computeFitScale(
        viewport(1280, 720, 32),
        DESIGN_BOX,
        DEFAULT_SCALE_OPTIONS,
      ),
    ).toBe(50);
    // Smaller root font -> more room -> larger scale.
    expect(
      computeFitScale(
        viewport(1280, 720, 8),
        DESIGN_BOX,
        DEFAULT_SCALE_OPTIONS,
      ),
    ).toBe(120);
  });
});

describe("createLayoutScale", () => {
  const createScale = (scaleOptions?: readonly number[]) =>
    createLayoutScale({ designBox: DESIGN_BOX, scaleOptions });

  it("starts at 100%", () => {
    expect(createScale().useStore.getState().scale).toBe(100);
  });

  it("exposes the default options when none are configured", () => {
    expect(createScale().scaleOptions).toEqual([...DEFAULT_SCALE_OPTIONS]);
  });

  it("normalizes configured options to a sorted, deduplicated list", () => {
    expect(createScale([100, 50, 100, 75]).scaleOptions).toEqual([50, 75, 100]);
  });

  it("rejects an empty option list", () => {
    expect(() => createScale([])).toThrow();
  });

  describe("setScale", () => {
    it("applies a configured option", () => {
      const { useStore } = createScale();
      useStore.getState().setScale(140);
      expect(useStore.getState().scale).toBe(140);
    });

    it("ignores values outside the configured options", () => {
      const { useStore } = createScale();
      useStore.getState().setScale(55);
      expect(useStore.getState().scale).toBe(100);
    });
  });

  describe("zoomIn / zoomOut", () => {
    it("steps through neighboring options", () => {
      const { useStore } = createScale();
      useStore.getState().zoomIn();
      expect(useStore.getState().scale).toBe(120);
      useStore.getState().zoomOut();
      useStore.getState().zoomOut();
      expect(useStore.getState().scale).toBe(90);
    });

    it("stops at the largest option", () => {
      const { useStore } = createScale();
      useStore.getState().setScale(200);
      useStore.getState().zoomIn();
      expect(useStore.getState().scale).toBe(200);
    });

    it("stops at the smallest option", () => {
      const { useStore } = createScale();
      useStore.getState().setScale(50);
      useStore.getState().zoomOut();
      expect(useStore.getState().scale).toBe(50);
    });

    it("snaps onto the option ladder when the scale is between options", () => {
      // 100 is not an option here, so the initial scale sits off-ladder.
      const up = createScale([50, 150]);
      up.useStore.getState().zoomIn();
      expect(up.useStore.getState().scale).toBe(150);

      const down = createScale([50, 150]);
      down.useStore.getState().zoomOut();
      expect(down.useStore.getState().scale).toBe(50);
    });

    it("clamps to the nearest edge when off-ladder past the extremes", () => {
      const aboveAll = createScale([50, 60]);
      aboveAll.useStore.getState().zoomIn();
      expect(aboveAll.useStore.getState().scale).toBe(60);

      const belowAll = createScale([150, 200]);
      belowAll.useStore.getState().zoomOut();
      expect(belowAll.useStore.getState().scale).toBe(150);
    });
  });

  describe("fitToScreen", () => {
    it("no-ops without a window", () => {
      const { useStore } = createScale();
      expect(typeof window).toBe("undefined");
      useStore.getState().fitToScreen();
      expect(useStore.getState().scale).toBe(100);
    });
  });
});
