import { createContext, useContext } from "react";

import { LightNodeRegistration } from "./types";

type LightRigContextValue = {
  registerNode: (node: LightNodeRegistration) => () => void;
  setLightState: (ids: string | string[], isOn: boolean) => void;
  playIntroWave: () => void;
  isIntroPlaying: boolean;
};

const LightRigContext = createContext<LightRigContextValue | null>(null);

const useLightRig = () => {
  const ctx = useContext(LightRigContext);
  if (!ctx) {
    throw new Error("useLightRig must be used within a LightRigProvider");
  }
  return ctx;
};

export { LightRigContext, useLightRig };
export type { LightRigContextValue };
