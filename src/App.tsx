import { lazy, Suspense, useEffect, useMemo } from "react";

import "@fontsource-variable/albert-sans";
import "@/assets/fonts/fusion-pixel.css";

import { PixelatedSpinner } from "@/components/common/PixelatedSpinner";
import { ToastProvider, TooltipProvider } from "@/components/ui";
import { useMobileWarning } from "@/hooks/useMobileWarning";
import { AppErrorBoundary } from "@/providers/AppErrorBoundary";
import { GlobalErrorHandler } from "@/providers/GlobalErrorHandler";

// Dynamically import Drumhaus component
const DrumhausProvider = lazy(() =>
  import("./providers/DrumhausProvider").then((module) => ({
    default: module.DrumhausProvider,
  })),
);
const Drumhaus = lazy(() => import("./components/Drumhaus"));
const DrumhausMobile = lazy(() => import("./components/mobile/DrumhausMobile"));

function DrumhausFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
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

  const isMobile = useMobileWarning();

  // Hide initial loader when app mounts
  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (loader) {
      loader.style.display = "none";
    }
  }, []);

  return (
    <TooltipProvider>
      <ToastProvider>
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
        <AppErrorBoundary>
          <GlobalErrorHandler />
          <Suspense fallback={<DrumhausFallback />}>
            <DrumhausProvider>
              {isMobile ? <DrumhausMobile /> : <Drumhaus />}
            </DrumhausProvider>
          </Suspense>
        </AppErrorBoundary>
      </ToastProvider>
    </TooltipProvider>
  );
}
