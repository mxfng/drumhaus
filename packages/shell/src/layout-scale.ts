import { create, type StoreApi, type UseBoundStore } from "zustand";

/**
 * The zoom stops offered by the shell, as percentages of the design size.
 * Instruments can override the list per `createLayoutScale` config; the
 * default is shared so the whole family steps through the same stops.
 */
const DEFAULT_SCALE_OPTIONS: readonly number[] = [
  50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200,
];

/**
 * An instrument's fixed design-time geometry, in rem.
 *
 * The chassis is laid out at exactly this size and then scaled as one unit;
 * the shell derives both the CSS geometry (via injected custom properties)
 * and the fit-to-screen math from these numbers, so the two can never drift.
 */
interface DesignBox {
  /** Chassis width. */
  widthRem: number;
  /** Chassis height, excluding the header and footer rows. */
  heightRem: number;
  /** Height of the header row above the chassis. */
  headerHeightRem: number;
  /** Height of the footer row below the chassis. */
  footerHeightRem: number;
  /** Minimum margin kept around the scaled layout when fitting to screen. */
  paddingRem: number;
}

interface LayoutScaleConfig {
  designBox: DesignBox;
  /** Zoom stops in percent; defaults to `DEFAULT_SCALE_OPTIONS`. */
  scaleOptions?: readonly number[];
}

interface LayoutScaleState {
  /** Current scale in percent. */
  scale: number;
  /** Set the scale to one of the configured options (others are ignored). */
  setScale: (scale: number) => void;
  /** Step to the next larger option, if any. */
  zoomIn: () => void;
  /** Step to the next smaller option, if any. */
  zoomOut: () => void;
  /** Pick the largest option that fits the current window. */
  fitToScreen: () => void;
}

/**
 * A per-instrument layout-scale instance: the bound zustand store plus the
 * static configuration the shell components render from.
 */
interface LayoutScale {
  useStore: UseBoundStore<StoreApi<LayoutScaleState>>;
  scaleOptions: readonly number[];
  designBox: DesignBox;
}

interface Viewport {
  widthPx: number;
  heightPx: number;
  /** The root font size in px, which rem-based design boxes resolve against. */
  rootFontSizePx: number;
}

/**
 * Pure fit-to-screen math: the ideal scale is the largest ratio at which the
 * whole design box (plus its minimum padding) fits the viewport, and the
 * result is the largest configured option that does not exceed it (falling
 * back to the smallest option when even that does not fit).
 */
function computeFitScale(
  viewport: Viewport,
  designBox: DesignBox,
  scaleOptions: readonly number[],
): number {
  const designWidthRem = designBox.widthRem;
  const designHeightRem =
    designBox.heightRem + designBox.headerHeightRem + designBox.footerHeightRem;

  const designWidthPx = designWidthRem * viewport.rootFontSizePx;
  const designHeightPx = designHeightRem * viewport.rootFontSizePx;
  const scalePaddingPx = designBox.paddingRem * viewport.rootFontSizePx;

  // Subtract padding from available space
  const availableWidth = viewport.widthPx - scalePaddingPx;
  const availableHeight = viewport.heightPx - scalePaddingPx;

  // Calculate the ideal scale as a percentage
  let idealScaleRatio = Math.min(
    availableWidth / designWidthPx,
    availableHeight / designHeightPx,
  );

  if (!Number.isFinite(idealScaleRatio) || idealScaleRatio <= 0) {
    idealScaleRatio = 1;
  }

  const idealScalePercent = idealScaleRatio * 100;

  // Find the closest scale option that fits (doesn't exceed the ideal)
  let bestScale = scaleOptions[0];
  for (const option of scaleOptions) {
    if (option <= idealScalePercent) {
      bestScale = option;
    } else {
      break;
    }
  }

  return bestScale;
}

/**
 * Create a layout-scale instance for one instrument.
 *
 * The store is intentionally not persisted: every load starts at 100% and
 * the shell root fits to screen once on mount, so the user always lands on
 * the best zoom for their current window.
 */
function createLayoutScale(config: LayoutScaleConfig): LayoutScale {
  const { designBox } = config;
  const scaleOptions = [...(config.scaleOptions ?? DEFAULT_SCALE_OPTIONS)]
    .filter((option, index, all) => all.indexOf(option) === index)
    .sort((a, b) => a - b);

  if (scaleOptions.length === 0) {
    throw new Error("createLayoutScale requires at least one scale option");
  }

  const useStore = create<LayoutScaleState>((set) => ({
    scale: 100,

    setScale: (newScale: number) => {
      if (scaleOptions.includes(newScale)) {
        set({ scale: newScale });
      }
    },

    zoomIn: () => {
      set((state) => {
        const currentIndex = scaleOptions.indexOf(state.scale);
        if (currentIndex === -1) {
          // If current scale is not in options, find the next higher one
          const nextOption = scaleOptions.find((opt) => opt > state.scale);
          return { scale: nextOption ?? scaleOptions[scaleOptions.length - 1] };
        }
        // Move to next scale option if available
        if (currentIndex < scaleOptions.length - 1) {
          return { scale: scaleOptions[currentIndex + 1] };
        }
        return state;
      });
    },

    zoomOut: () => {
      set((state) => {
        const currentIndex = scaleOptions.indexOf(state.scale);
        if (currentIndex === -1) {
          // If current scale is not in options, find the next lower one
          const prevOption = [...scaleOptions]
            .reverse()
            .find((opt) => opt < state.scale);
          return { scale: prevOption ?? scaleOptions[0] };
        }
        // Move to previous scale option if available
        if (currentIndex > 0) {
          return { scale: scaleOptions[currentIndex - 1] };
        }
        return state;
      });
    },

    fitToScreen: () => {
      if (typeof window === "undefined") return;

      const rootFontSizePx = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );

      set({
        scale: computeFitScale(
          {
            widthPx: window.innerWidth,
            heightPx: window.innerHeight,
            rootFontSizePx,
          },
          designBox,
          scaleOptions,
        ),
      });
    },
  }));

  return { useStore, scaleOptions, designBox };
}

export {
  computeFitScale,
  createLayoutScale,
  DEFAULT_SCALE_OPTIONS,
  type DesignBox,
  type LayoutScale,
  type LayoutScaleConfig,
  type LayoutScaleState,
  type Viewport,
};
