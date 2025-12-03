import { useEffect, useState } from "react";

import { clamp } from "@/shared/lib/utils";

const DESIGN_WIDTH_REM = 90; // w-360 in Tailwind, 1440px
const DESIGN_HEIGHT_REM = 56.25; // h-225 in Tailwind, 900px
const SCALE_PADDING_REM = 3; // 3rem
const MIN_SCALE = 0.25;
const MAX_SCALE = 1.25;

type LayoutScaleProps = {
  scale: number;
};

export const useLayoutScale = (): LayoutScaleProps => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let frameId: number | null = null;

    const updateScale = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Convert rem to pixels based on root font size
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const designWidthPx = DESIGN_WIDTH_REM * rootFontSize;
      const designHeightPx = DESIGN_HEIGHT_REM * rootFontSize;
      const scalePaddingPx = SCALE_PADDING_REM * rootFontSize;

      const availableWidth = viewportWidth - scalePaddingPx;
      const availableHeight = viewportHeight - scalePaddingPx;

      let nextScale = Math.min(
        availableWidth / designWidthPx,
        availableHeight / designHeightPx,
      );

      if (!Number.isFinite(nextScale) || nextScale <= 0) {
        nextScale = 1;
      }

      nextScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);

      setScale(nextScale);
    };

    const handleResize = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateScale();
      });
    };

    // Initial calculation
    updateScale();

    window.addEventListener("resize", handleResize);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return { scale };
};
