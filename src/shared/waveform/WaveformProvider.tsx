import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  getCachedWaveform,
  type TransientWaveformData,
} from "@/core/audio/cache";
import { WaveformContext, type WaveformState } from "./WaveformContext";

interface WaveformProviderProps extends PropsWithChildren {
  expectedCount?: number;
}

export const WaveformProvider: React.FC<WaveformProviderProps> = ({
  expectedCount = 8,
  children,
}) => {
  const [loadedCount, setLoadedCount] = useState(0);

  // State map tracking data/loading/error for each waveform
  const [waveformStates, setWaveformStates] = useState<
    Map<string, WaveformState>
  >(new Map());

  // Track ongoing fetch promises to prevent duplicate requests
  const loadingPromises = useRef<
    Map<string, Promise<TransientWaveformData | null>>
  >(new Map());

  const getWaveform = useCallback(
    async (sampleFilename: string): Promise<TransientWaveformData | null> => {
      // Return cached data if available
      const state = waveformStates.get(sampleFilename);
      if (state?.data) {
        return state.data;
      }

      // Return existing loading promise if one is in flight
      if (loadingPromises.current.has(sampleFilename)) {
        return loadingPromises.current.get(sampleFilename)!;
      }

      // Set loading state
      setWaveformStates((prev) => {
        const next = new Map(prev);
        next.set(sampleFilename, {
          data: null,
          isLoading: true,
          error: null,
        });
        return next;
      });

      // Start new fetch
      const loadPromise = getCachedWaveform(sampleFilename)
        .then((data) => {
          setWaveformStates((prev) => {
            const next = new Map(prev);
            next.set(sampleFilename, {
              data,
              isLoading: false,
              error: null,
            });
            return next;
          });
          loadingPromises.current.delete(sampleFilename);

          // Auto-register successful loads for readiness tracking
          if (data) {
            setLoadedCount((prev) => Math.min(prev + 1, expectedCount));
          }

          return data;
        })
        .catch((error) => {
          const normalizedError =
            error instanceof Error ? error : new Error(String(error));
          console.error(`Failed to load waveform for ${sampleFilename}`, error);
          setWaveformStates((prev) => {
            const next = new Map(prev);
            next.set(sampleFilename, {
              data: null,
              isLoading: false,
              error: normalizedError,
            });
            return next;
          });
          loadingPromises.current.delete(sampleFilename);
          return null;
        });

      loadingPromises.current.set(sampleFilename, loadPromise);
      return loadPromise;
    },
    [waveformStates, expectedCount],
  );

  const getWaveformState = useCallback(
    (sampleFilename: string): WaveformState => {
      const state = waveformStates.get(sampleFilename);

      // Return existing state or initial loading state
      // Note: Load should be triggered by the caller in useEffect, not here
      return (
        state ?? {
          data: null,
          isLoading: false,
          error: null,
        }
      );
    },
    [waveformStates],
  );

  const isWaveformLoaded = useCallback(
    (sampleFilename: string): boolean => {
      return (
        waveformStates.has(sampleFilename) &&
        waveformStates.get(sampleFilename)?.data !== null
      );
    },
    [waveformStates],
  );

  const areWaveformsReady = loadedCount >= expectedCount;

  const value = useMemo(
    () => ({
      getWaveform,
      getWaveformState,
      isWaveformLoaded,
      areWaveformsReady,
    }),
    [getWaveform, getWaveformState, isWaveformLoaded, areWaveformsReady],
  );

  return (
    <WaveformContext.Provider value={value}>
      {children}
    </WaveformContext.Provider>
  );
};
