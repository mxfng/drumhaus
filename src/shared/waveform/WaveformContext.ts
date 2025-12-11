import { createContext } from "react";

import type { TransientWaveformData } from "@/core/audio/cache";

export interface WaveformState {
  data: TransientWaveformData | null;
  isLoading: boolean;
  error: Error | null;
}

export interface WaveformContextValue {
  /**
   * Get waveform data for a given sample filename.
   * Returns cached data if available, otherwise loads and caches it.
   */
  getWaveform: (
    sampleFilename: string,
  ) => Promise<TransientWaveformData | null>;

  /**
   * Get the current state (data, loading, error) for a specific waveform.
   */
  getWaveformState: (sampleFilename: string) => WaveformState;

  /**
   * Check if a specific waveform is loaded in the cache
   */
  isWaveformLoaded: (sampleFilename: string) => boolean;

  /**
   * Check if all expected waveforms have been loaded (for intro animation)
   */
  areWaveformsReady: boolean;
}

export const WaveformContext = createContext<WaveformContextValue | null>(null);
