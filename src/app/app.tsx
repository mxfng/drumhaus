import { lazy, Suspense, useEffect, useMemo } from "react";

import "@fontsource-variable/albert-sans";
import "@/assets/fonts/fusion-pixel.css";

import { AppErrorBoundary } from "@/core/providers/app-error-boundary";
import {
  DrumhausProvider,
  useDrumhaus,
} from "@/core/providers/drumhaus-provider";
import { GlobalErrorHandler } from "@/core/providers/global-error-handler";
import { DebugOverlay } from "@/features/debug/components/debug-overlay";
import { NightSky } from "@/features/night/components/night-sky";
import { useNightModeStore } from "@/features/night/store/use-night-mode-store";
import { PixelatedSpinner } from "@/shared/components/pixelated-spinner";
import { AboutDialog } from "@/shared/dialogs/about-dialog";
import { MobileDialog } from "@/shared/dialogs/mobile-dialog";
import { useMobileWarning } from "@/shared/hooks/use-mobile-warning";
import { useSequencerEscToVoice } from "@/shared/hooks/use-sequencer-esc-to-voice";
import { useServiceWorker } from "@/shared/hooks/use-service-worker";
import { useSpacebarTogglePlay } from "@/shared/hooks/use-spacebar-toggle-play";
import { useLightShowIntro } from "@/shared/lightshow";
import { LightRigProvider } from "@/shared/lightshow/light-rig-provider";
import { useDialogStore } from "@/shared/store/use-dialog-store";
import { ToastProvider } from "@/shared/ui/toast";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { useWaveform, WaveformProvider } from "@/shared/waveform";

const Drumhaus = lazy(() => import("../layout/drumhaus"));

function DrumhausFallback() {
  return (
    <div className="flex h-dvh w-dvw items-center justify-center">
      <PixelatedSpinner size={64} />
    </div>
  );
}

function getPresetTitleFromSlug(slug: string | null): string {
  if (!slug) return "Drumhaus";

  try {
    const decoded = decodeURIComponent(slug);
    const words = decoded
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    if (words.length === 0) return "Drumhaus";

    return `Drumhaus | ${words.join(" ")}`;
  } catch {
    return "Drumhaus";
  }
}

function AppOrchestrator() {
  // --- Context (requires providers) ---
  const { instrumentRuntimes, instrumentRuntimesVersion } = useDrumhaus();
  const { areWaveformsReady } = useWaveform();

  // --- Dialog State ---
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);

  // --- Global Behavior Hooks ---
  useMobileWarning();

  useSpacebarTogglePlay({
    instrumentRuntimes,
    instrumentRuntimesVersion,
  });

  useSequencerEscToVoice();

  // --- Lightshow ---
  useLightShowIntro(instrumentRuntimesVersion > 0 && areWaveformsReady, 320);

  return (
    <>
      <Drumhaus />
      <MobileDialog isOpen={activeDialog === "mobile"} onClose={closeDialog} />
      <AboutDialog isOpen={activeDialog === "about"} onClose={closeDialog} />
      <DebugOverlay />
    </>
  );
}

function App() {
  // --- App-level setup (outside providers) ---

  // Get preset name from URL search params
  const title = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return getPresetTitleFromSlug(params.get("n"));
  }, []);

  // Service Worker Registration
  useServiceWorker();

  // Night Mode
  const nightMode = useNightModeStore((state) => state.nightMode);

  // Add night mode class to document elements
  useEffect(() => {
    const elements = [document.documentElement, document.body];
    const root = document.getElementById("root");
    if (root) elements.push(root);

    if (nightMode) {
      elements.forEach((el) => el.classList.add("night-mode"));
    } else {
      elements.forEach((el) => el.classList.remove("night-mode"));
    }
  }, [nightMode]);

  return (
    <>
      <title>{title}</title>
      {nightMode && <NightSky />}
      <Suspense fallback={<DrumhausFallback />}>
        <ToastProvider>
          <AppErrorBoundary>
            <GlobalErrorHandler />
            <TooltipProvider>
              <LightRigProvider>
                <DrumhausProvider>
                  <WaveformProvider>
                    <AppOrchestrator />
                  </WaveformProvider>
                </DrumhausProvider>
              </LightRigProvider>
            </TooltipProvider>
          </AppErrorBoundary>
        </ToastProvider>
      </Suspense>
    </>
  );
}

export { App };
