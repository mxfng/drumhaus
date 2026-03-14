import { lazy, Suspense, useEffect, useMemo } from "react";

import "@fontsource-variable/albert-sans";
import "@/assets/fonts/fusion-pixel.css";

import {
  DrumhausProvider,
  useDrumhaus,
} from "@/core/providers/drumhaus-provider";
import { DebugOverlay } from "@/features/debug/components/debug-overlay";
import { useNightModeStore } from "@/features/night/store/use-night-mode-store";
import { PixelatedSpinner } from "@/shared/components/pixelated-spinner";
import { useMobileWarning } from "@/shared/hooks/use-mobile-warning";
import { useSequencerEscToVoice } from "@/shared/hooks/use-sequencer-esc-to-voice";
import { useServiceWorker } from "@/shared/hooks/use-service-worker";
import { useSpacebarTogglePlay } from "@/shared/hooks/use-spacebar-toggle-play";
import { useLightShowIntro } from "@/shared/lightshow";
import { LightRigProvider } from "@/shared/lightshow/light-rig-provider";
import { useDialogStore } from "@/shared/store/use-dialog-store";
import { useWaveform } from "@/shared/waveform";

// Providers

const AppErrorBoundary = lazy(() =>
  import("@/core/providers/app-error-boundary").then((module) => ({
    default: module.AppErrorBoundary,
  })),
);

const GlobalErrorHandler = lazy(() =>
  import("@/core/providers/global-error-handler").then((module) => ({
    default: module.GlobalErrorHandler,
  })),
);

const TooltipProvider = lazy(() =>
  import("@/shared/ui/tooltip").then((module) => ({
    default: module.TooltipProvider,
  })),
);

const ToastProvider = lazy(() =>
  import("@/shared/ui/toast").then((module) => ({
    default: module.ToastProvider,
  })),
);

const WaveformProvider = lazy(() =>
  import("@/shared/waveform/waveform-provider").then((module) => ({
    default: module.WaveformProvider,
  })),
);

// App layout

const Drumhaus = lazy(() => import("../layout/drumhaus"));

// Dialogs

const MobileDialog = lazy(() =>
  import("@/shared/dialogs/mobile-dialog").then((module) => ({
    default: module.MobileDialog,
  })),
);

const AboutDialog = lazy(() =>
  import("@/shared/dialogs/about-dialog").then((module) => ({
    default: module.AboutDialog,
  })),
);

// Easter eggs

const NightSky = lazy(() =>
  import("@/features/night/components/night-sky").then((module) => ({
    default: module.NightSky,
  })),
);

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
      <Suspense fallback={null}>
        <MobileDialog
          isOpen={activeDialog === "mobile"}
          onClose={closeDialog}
        />
      </Suspense>
      <Suspense fallback={null}>
        <AboutDialog isOpen={activeDialog === "about"} onClose={closeDialog} />
      </Suspense>
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
      {nightMode && (
        <Suspense fallback={null}>
          <NightSky />
        </Suspense>
      )}
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
