import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

interface WaveformReadinessContextValue {
  registerWaveformLoaded: () => void;
  areWaveformsReady: boolean;
}

export const WaveformReadinessContext =
  createContext<WaveformReadinessContextValue | null>(null);

export const useWaveformReadiness = () => {
  const ctx = useContext(WaveformReadinessContext);
  if (!ctx) {
    throw new Error(
      "useWaveformReadiness must be used within a WaveformReadinessProvider",
    );
  }
  return ctx;
};

interface WaveformReadinessProviderProps extends PropsWithChildren {
  expectedCount?: number;
}

export const WaveformReadinessProvider: React.FC<
  WaveformReadinessProviderProps
> = ({ expectedCount = 8, children }) => {
  const [loadedCount, setLoadedCount] = useState(0);

  const registerWaveformLoaded = useCallback(() => {
    setLoadedCount((prev) => Math.min(prev + 1, expectedCount));
  }, [expectedCount]);

  const areWaveformsReady = loadedCount >= expectedCount;

  const value = useMemo(
    () => ({ registerWaveformLoaded, areWaveformsReady }),
    [registerWaveformLoaded, areWaveformsReady],
  );

  return (
    <WaveformReadinessContext.Provider value={value}>
      {children}
    </WaveformReadinessContext.Provider>
  );
};
