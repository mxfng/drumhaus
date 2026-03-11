import { useContext } from "react";

import { DrumhausContext } from "./drumhaus-context";

export const useDrumhaus = () => {
  const context = useContext(DrumhausContext);
  if (!context) {
    throw new Error("useDrumhaus must be used within DrumhausProvider");
  }
  return context;
};
