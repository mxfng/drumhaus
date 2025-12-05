import { create } from "zustand";

export const SCALE_OPTIONS = [50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200];

interface LayoutScaleStore {
  scale: number;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
}

export const useLayoutScaleStore = create<LayoutScaleStore>((set) => ({
  scale: 100,

  setScale: (newScale: number) => {
    if (SCALE_OPTIONS.includes(newScale)) {
      set({ scale: newScale });
    }
  },

  zoomIn: () => {
    set((state) => {
      const currentIndex = SCALE_OPTIONS.indexOf(state.scale);
      if (currentIndex === -1) {
        // If current scale is not in options, find the next higher one
        const nextOption = SCALE_OPTIONS.find((opt) => opt > state.scale);
        return { scale: nextOption ?? SCALE_OPTIONS[SCALE_OPTIONS.length - 1] };
      }
      // Move to next scale option if available
      if (currentIndex < SCALE_OPTIONS.length - 1) {
        return { scale: SCALE_OPTIONS[currentIndex + 1] };
      }
      return state;
    });
  },

  zoomOut: () => {
    set((state) => {
      const currentIndex = SCALE_OPTIONS.indexOf(state.scale);
      if (currentIndex === -1) {
        // If current scale is not in options, find the next lower one
        const prevOption = [...SCALE_OPTIONS]
          .reverse()
          .find((opt) => opt < state.scale);
        return { scale: prevOption ?? SCALE_OPTIONS[0] };
      }
      // Move to previous scale option if available
      if (currentIndex > 0) {
        return { scale: SCALE_OPTIONS[currentIndex - 1] };
      }
      return state;
    });
  },

  fitToScreen: () => {
    if (typeof window === "undefined") return;

    const DESIGN_WIDTH_REM = 90; // w-360 in Tailwind, 1440px
    const DESIGN_HEIGHT_REM = 56.25; // h-225 in Tailwind, 900px
    const HEADER_HEIGHT_REM = 2.5; // h-10, 40px
    const FOOTER_HEIGHT_REM = 2.5; // h-10, 40px
    const SCALE_PADDING_REM = 2.5; // Padding per side (matches --app-padding / 2)

    // Use visualViewport for more accurate measurements in Safari
    // Falls back to window.innerWidth/Height if visualViewport is unavailable
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

    // Convert rem to pixels based on root font size
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const designWidthPx = DESIGN_WIDTH_REM * rootFontSize;
    // Include header and footer in total height calculation
    const designHeightPx =
      (DESIGN_HEIGHT_REM + HEADER_HEIGHT_REM + FOOTER_HEIGHT_REM) *
      rootFontSize;
    const scalePaddingPx = SCALE_PADDING_REM * rootFontSize;

    // Subtract padding from BOTH sides (left+right, top+bottom)
    const availableWidth = viewportWidth - scalePaddingPx * 2;
    const availableHeight = viewportHeight - scalePaddingPx * 2;

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
    let bestScale = SCALE_OPTIONS[0];
    for (const option of SCALE_OPTIONS) {
      if (option <= idealScalePercent) {
        bestScale = option;
      } else {
        break;
      }
    }

    set({ scale: bestScale });
  },
}));
