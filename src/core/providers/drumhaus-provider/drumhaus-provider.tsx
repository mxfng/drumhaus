import { useAudioEngine } from "@/core/audio/hooks/use-audio-engine";
import { usePresetLoading } from "@/features/preset/hooks/use-preset-loading";
import { DrumhausContext, type DrumhausContextValue } from "./drumhaus-context";

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
