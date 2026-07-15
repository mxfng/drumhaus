import { useEngineBridge } from "@/core/audio/bridge/use-engine-bridge";
import { useKitLoadFailureToast } from "@/core/audio/bridge/use-kit-load-failure";
import { usePresetLoading } from "@/features/preset/hooks/use-preset-loading";
import { DrumhausContext, type DrumhausContextValue } from "./drumhaus-context";

interface DrumhausProviderProps {
  children: React.ReactNode;
}

const DrumhausProvider = ({ children }: DrumhausProviderProps) => {
  // --- Audio Engine Bridge and Preset Loading ---
  useEngineBridge();
  useKitLoadFailureToast();
  const { loadPresetFile, importPresetFileText } = usePresetLoading();

  const value: DrumhausContextValue = {
    loadPresetFile,
    importPresetFileText,
  };

  return (
    <DrumhausContext.Provider value={value}>
      {children}
    </DrumhausContext.Provider>
  );
};

export { DrumhausProvider };
