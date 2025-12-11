import { useContext } from "react";

import { WaveformContext } from "./WaveformContext";

export const useWaveform = () => {
  const ctx = useContext(WaveformContext);
  if (!ctx) {
    throw new Error("useWaveform must be used within a WaveformProvider");
  }
  return ctx;
};
