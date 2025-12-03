import { lazy, Suspense } from "react";

import { useAudioEngine } from "@/core/audio/hooks/useAudioEngine";
import { DebugOverlay } from "@/features/debug/components/DebugOverlay";
import { usePresetLoading } from "@/features/preset/hooks/usePresetLoading";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { DrumhausContext, type DrumhausContextValue } from "./DrumhausContext";

const AboutDialog = lazy(() =>
  import("@/shared/dialogs/AboutDialog").then((module) => ({
    default: module.AboutDialog,
  })),
);

interface DrumhausProviderProps {
  children: React.ReactNode;
}

export const DrumhausProvider = ({ children }: DrumhausProviderProps) => {
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
      <Suspense fallback={null}>
        <AboutDialog isOpen={activeDialog === "about"} onClose={closeDialog} />
      </Suspense>
      <DebugOverlay />
    </DrumhausContext.Provider>
  );
};
