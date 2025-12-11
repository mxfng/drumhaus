import { createContext } from "react";

import type { TransientWaveformData } from "@/core/audio/cache";

export interface WaveformContextValue {
  /**
   * Get waveform data for a given sample filename.
   * Returns cached data if available, otherwise loads and caches it.
   */
  getWaveform: (
    sampleFilename: string,
  ) => Promise<TransientWaveformData | null>;

  /**
   * Check if a specific waveform is loaded in the cache
   */
  isWaveformLoaded: (sampleFilename: string) => boolean;

  /**
   * Register that a waveform has been successfully loaded (for readiness tracking)
   */
  registerWaveformLoaded: () => void;

  /**
   * Check if all expected waveforms have been loaded (for intro animation)
   */
  areWaveformsReady: boolean;
}

export const WaveformContext = createContext<WaveformContextValue | null>(null);
