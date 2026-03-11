import { useContext } from "react";

import { WaveformContext } from "./waveform-context";

export const useWaveform = () => {
  const ctx = useContext(WaveformContext);
  if (!ctx) {
    throw new Error("useWaveform must be used within a WaveformProvider");
  }
  return ctx;
};
