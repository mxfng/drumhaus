import { createContext, useContext } from "react";

import { LightNodeRegistration } from "./types";

export type LightRigContextValue = {
  registerNode: (node: LightNodeRegistration) => () => void;
  setLightState: (ids: string | string[], isOn: boolean) => void;
  playIntroWave: () => void;
  isIntroPlaying: boolean;
};

export const LightRigContext = createContext<LightRigContextValue | null>(null);

export const useLightRig = () => {
  const ctx = useContext(LightRigContext);
  if (!ctx) {
    throw new Error("useLightRig must be used within a LightRigProvider");
  }
  return ctx;
};
