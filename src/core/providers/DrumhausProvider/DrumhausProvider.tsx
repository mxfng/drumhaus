import { useAudioEngine } from "@/core/audio/hooks/useAudioEngine";
import { usePresetLoading } from "@/features/preset/hooks/usePresetLoading";
import { DrumhausContext, type DrumhausContextValue } from "./DrumhausContext";

interface DrumhausProviderProps {
  children: React.ReactNode;
}

export const DrumhausProvider = ({ children }: DrumhausProviderProps) => {
  // --- Audio Engine and Preset Loading ---
  const { instrumentRuntimes, instrumentRuntimesVersion } = useAudioEngine();
  const { loadPreset } = usePresetLoading({ instrumentRuntimes });

  const value: DrumhausContextValue = {
    instrumentRuntimes,
    instrumentRuntimesVersion,
    loadPreset,
  };

  return (
    <DrumhausContext.Provider value={value}>
      {children}
    </DrumhausContext.Provider>
  );
};
