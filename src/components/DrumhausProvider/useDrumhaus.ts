import { useContext } from "react";

import { DrumhausContext } from "./DrumhausContext";

export const useDrumhaus = () => {
  const context = useContext(DrumhausContext);
  if (!context) {
    throw new Error("useDrumhaus must be used within DrumhausProvider");
  }
  return context;
};
