import { useEffect, useEffectEvent } from "react";

import { useLightRig } from "./light-rig-context";

export const useLightShowIntro = (
  enabled: boolean = true,
  delayMs: number = 200,
) => {
  const { playIntroWave } = useLightRig();
  const playIntro = useEffectEvent(() => {
    playIntroWave();
  });

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => playIntro(), delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, delayMs]);
};
