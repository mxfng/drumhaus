import { useEffect, useState } from "react";

import { clamp } from "@/shared/lib/utils";

const DESIGN_WIDTH = 1538;
const DESIGN_HEIGHT = 1100;
const SCALE_PADDING = 32;
const MIN_SCALE = 0.6;
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

      const availableWidth = viewportWidth - SCALE_PADDING;
      const availableHeight = viewportHeight - SCALE_PADDING;

      let nextScale = Math.min(
        availableWidth / DESIGN_WIDTH,
        availableHeight / DESIGN_HEIGHT,
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
