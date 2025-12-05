import { useEffect } from "react";

import { useLayoutScaleStore } from "@/shared/store/useLayoutScaleStore";

type LayoutScaleResult = {
  scale: number;
  fitToScreen: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setScale: (scale: number) => void;
};

export const useLayoutScale = (): LayoutScaleResult => {
  const scale = useLayoutScaleStore((state) => state.scale);
  const fitToScreen = useLayoutScaleStore((state) => state.fitToScreen);
  const zoomIn = useLayoutScaleStore((state) => state.zoomIn);
  const zoomOut = useLayoutScaleStore((state) => state.zoomOut);
  const setScale = useLayoutScaleStore((state) => state.setScale);

  // Fit to screen on initial mount only
  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { scale, fitToScreen, zoomIn, zoomOut, setScale };
};
