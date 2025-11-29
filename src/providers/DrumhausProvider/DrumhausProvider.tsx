import { AboutDialog } from "@/components/dialog/AboutDialog";
import { useRemoveInitialLoader } from "@/hooks/ui/useRemoveInitialLoader";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { usePresetLoading } from "@/hooks/usePresetLoading";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useDialogStore } from "@/stores/useDialogStore";
import { DrumhausContext, type DrumhausContextValue } from "./DrumhausContext";

interface DrumhausProviderProps {
  children: React.ReactNode;
}

export const DrumhausProvider = ({ children }: DrumhausProviderProps) => {
  // --- App-wide UI Hooks ---
  useRemoveInitialLoader();

  // --- Service Worker Registration ---
  useServiceWorker();

  // --- Audio Engine and Preset Loading ---
  const { instrumentRuntimes, instrumentRuntimesVersion } = useAudioEngine();
  const { loadPreset } = usePresetLoading({ instrumentRuntimes });

  // --- Dialog State ---
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);

  const value: DrumhausContextValue = {
    instrumentRuntimes,
    instrumentRuntimesVersion,
    loadPreset,
  };

  return (
    <DrumhausContext.Provider value={value}>
      {children}
      <AboutDialog isOpen={activeDialog === "about"} onClose={closeDialog} />
    </DrumhausContext.Provider>
  );
};
