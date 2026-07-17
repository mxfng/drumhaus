import { useEngineBridge } from "@/core/audio/bridge/use-engine-bridge";
import { useKitLoadFailureToast } from "@/core/audio/bridge/use-kit-load-failure";
import { useSessionBridge } from "@/core/session/use-session-bridge";
import { usePresetLoading } from "@/features/preset/hooks/use-preset-loading";
import { DrumhausContext, type DrumhausContextValue } from "./drumhaus-context";

interface DrumhausProviderProps {
  children: React.ReactNode;
}

const DrumhausProvider = ({ children }: DrumhausProviderProps) => {
  // --- Audio Engine Bridge, Session Bridge, and Preset Loading ---
  useEngineBridge();
  useSessionBridge();
  useKitLoadFailureToast();
  const { loadPresetDocument, importPresetFileText } = usePresetLoading();

  const value: DrumhausContextValue = {
    loadPresetDocument,
    importPresetFileText,
  };

  return (
    <DrumhausContext.Provider value={value}>
      {children}
    </DrumhausContext.Provider>
  );
};

export { DrumhausProvider };
