import { lazy, Suspense, useEffect, useMemo } from "react";

import "@fontsource-variable/albert-sans";
import "@/assets/fonts/fusion-pixel.css";

import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
import { useServiceWorker } from "@/shared/hooks/useServiceWorker";
import { useNightModeStore } from "@/shared/store/useNightModeStore";

// Lazily import providers

const AppErrorBoundary = lazy(() =>
  import("@/core/providers/AppErrorBoundary").then((module) => ({
    default: module.AppErrorBoundary,
  })),
);

const GlobalErrorHandler = lazy(() =>
  import("@/core/providers/GlobalErrorHandler").then((module) => ({
    default: module.GlobalErrorHandler,
  })),
);

const TooltipProvider = lazy(() =>
  import("@/shared/ui/Tooltip").then((module) => ({
    default: module.TooltipProvider,
  })),
);

const ToastProvider = lazy(() =>
  import("@/shared/ui/Toast").then((module) => ({
    default: module.ToastProvider,
  })),
);

const DrumhausProvider = lazy(() =>
  import("../core/providers/DrumhausProvider").then((module) => ({
    default: module.DrumhausProvider,
  })),
);

// Lazily import app

const Drumhaus = lazy(() => import("../layout/desktop/Drumhaus"));
const NightSky = lazy(() =>
  import("@/shared/components/NightSky").then((module) => ({
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

export function App() {
  // Get preset name from URL search params
  const title = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return getPresetTitleFromSlug(params.get("n"));
  }, []);

  // --- Service Worker Registration ---
  useServiceWorker();

  // --- Night Mode ---
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
      <meta
        name="description"
        content="Drumhaus is a fast, browser-based drum machine inspired by classic hardware. Load instantly, work offline, and build beats with an intuitive 8-voice step-sequencer and curated drum kits."
      />
      <meta property="og:title" content={title} />
      <meta
        property="og:description"
        content="Drumhaus is a fast, browser-based drum machine inspired by classic hardware. Load instantly, work offline, and build beats with an intuitive 8-voice step-sequencer and curated drum kits."
      />
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
              <DrumhausProvider>
                <Drumhaus />
              </DrumhausProvider>
            </TooltipProvider>
          </AppErrorBoundary>
        </ToastProvider>
      </Suspense>
    </>
  );
}
