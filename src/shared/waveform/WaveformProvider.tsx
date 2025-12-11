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
import { WaveformContext } from "./WaveformContext";

interface WaveformProviderProps extends PropsWithChildren {
  expectedCount?: number;
}

export const WaveformProvider: React.FC<WaveformProviderProps> = ({
  expectedCount = 8,
  children,
}) => {
  const [loadedCount, setLoadedCount] = useState(0);

  // Cache of loaded waveform data keyed by sample filename
  const waveformCache = useRef<Map<string, TransientWaveformData | null>>(
    new Map(),
  );

  // Track ongoing fetch promises to prevent duplicate requests
  const loadingPromises = useRef<
    Map<string, Promise<TransientWaveformData | null>>
  >(new Map());

  const getWaveform = useCallback(
    async (sampleFilename: string): Promise<TransientWaveformData | null> => {
      // Return cached data if available
      if (waveformCache.current.has(sampleFilename)) {
        return waveformCache.current.get(sampleFilename) ?? null;
      }

      // Return existing loading promise if one is in flight
      if (loadingPromises.current.has(sampleFilename)) {
        return loadingPromises.current.get(sampleFilename)!;
      }

      // Start new fetch
      const loadPromise = getCachedWaveform(sampleFilename)
        .then((data) => {
          waveformCache.current.set(sampleFilename, data);
          loadingPromises.current.delete(sampleFilename);
          return data;
        })
        .catch((error) => {
          console.error(`Failed to load waveform for ${sampleFilename}`, error);
          waveformCache.current.set(sampleFilename, null);
          loadingPromises.current.delete(sampleFilename);
          return null;
        });

      loadingPromises.current.set(sampleFilename, loadPromise);
      return loadPromise;
    },
    [],
  );

  const isWaveformLoaded = useCallback((sampleFilename: string): boolean => {
    return waveformCache.current.has(sampleFilename);
  }, []);

  const registerWaveformLoaded = useCallback(() => {
    setLoadedCount((prev) => Math.min(prev + 1, expectedCount));
  }, [expectedCount]);

  const areWaveformsReady = loadedCount >= expectedCount;

  const value = useMemo(
    () => ({
      getWaveform,
      isWaveformLoaded,
      registerWaveformLoaded,
      areWaveformsReady,
    }),
    [getWaveform, isWaveformLoaded, registerWaveformLoaded, areWaveformsReady],
  );

  return (
    <WaveformContext.Provider value={value}>
      {children}
    </WaveformContext.Provider>
  );
};
