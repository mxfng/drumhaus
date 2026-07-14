import { useEngineBridge } from "@/core/audio/bridge/use-engine-bridge";
import { usePresetLoading } from "@/features/preset/hooks/use-preset-loading";
import { DrumhausContext, type DrumhausContextValue } from "./drumhaus-context";

interface DrumhausProviderProps {
  children: React.ReactNode;
}

const DrumhausProvider = ({ children }: DrumhausProviderProps) => {
  // --- Audio Engine Bridge and Preset Loading ---
  useEngineBridge();
  const { loadPreset } = usePresetLoading();

  const value: DrumhausContextValue = {
    loadPreset,
  };

  return (
    <DrumhausContext.Provider value={value}>
      {children}
    </DrumhausContext.Provider>
  );
};

export { DrumhausProvider };
