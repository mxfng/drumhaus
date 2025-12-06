import { createContext, useContext } from "react";

import { LightRigContextValue } from "./types";

export const LightRigContext = createContext<LightRigContextValue | null>(null);

export const useLightRig = () => {
  const ctx = useContext(LightRigContext);
  if (!ctx) {
    throw new Error("useLightRig must be used within a LightRigProvider");
  }
  return ctx;
};
