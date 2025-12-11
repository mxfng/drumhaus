import { useEffect } from "react";

import { useWaveform } from "./useWaveform";
import { normalizeSamplePath } from "./utils";
import type { WaveformState } from "./WaveformContext";

/**
 * Hook to get waveform data for a specific audio file.
 * Automatically normalizes the path and manages loading/error state.
 *
 * @param audioFile - The audio file path (e.g., "/samples/kit-name/kick.wav")
 * @returns Waveform state with data, loading, and error
 */
export function useWaveformData(audioFile: string): WaveformState {
  const { getWaveform, getWaveformState } = useWaveform();
  const sampleFilename = normalizeSamplePath(audioFile);

  // Get current state from context (will re-render when context updates)
  const state = getWaveformState(sampleFilename);

  // Trigger load if not already loaded or loading
  useEffect(() => {
    if (!state.data && !state.isLoading && !state.error) {
      void getWaveform(sampleFilename);
    }
  }, [sampleFilename, state.data, state.isLoading, state.error, getWaveform]);

  return state;
}
