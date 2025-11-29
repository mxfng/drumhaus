import { useAudioContextLifecycleMonitor } from "@/core/audio/hooks/useAudioContextLifecycle";
import { useAudioEngine } from "@/core/audio/hooks/useAudioEngine";
import { DebugOverlay } from "@/features/debug/components/DebugOverlay";
import { usePresetLoading } from "@/features/preset/hooks/usePresetLoading";
import { AboutDialog } from "@/shared/dialogs/AboutDialog";
import { useRemoveInitialLoader } from "@/shared/hooks/useRemoveInitialLoader";
import { useServiceWorker } from "@/shared/hooks/useServiceWorker";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { DrumhausContext, type DrumhausContextValue } from "./DrumhausContext";

interface DrumhausProviderProps {
  children: React.ReactNode;
}

export const DrumhausProvider = ({ children }: DrumhausProviderProps) => {
  // --- App-wide UI Hooks ---
  useRemoveInitialLoader();
  useAudioContextLifecycleMonitor();

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
      <DebugOverlay />
    </DrumhausContext.Provider>
  );
};
