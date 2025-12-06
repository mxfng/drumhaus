import { useEffect } from "react";

import { useLightRig } from "./LightRigContext";

export const useLightShowIntro = (
  enabled: boolean = true,
  delayMs: number = 200,
) => {
  const { playIntroWave } = useLightRig();

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => playIntroWave(), delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, playIntroWave, delayMs]);
};
