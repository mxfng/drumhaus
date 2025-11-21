import { lazy, Suspense, useEffect, useMemo } from "react";
import { Box, ChakraProvider } from "@chakra-ui/react";
import { Helmet } from "react-helmet-async";

import {
  AppErrorBoundary,
  GlobalErrorHandler,
} from "@/components/common/AppErrorBoundary";
import { PixelatedSpinner } from "@/components/common/PixelatedSpinner";
import theme from "@/theme/theme";

// Dynamically import Drumhaus component
const Drumhaus = lazy(() => import("./components/Drumhaus"));

function DrumhausFallback() {
  return (
    <Box
      w="100%"
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <PixelatedSpinner size={64} />
    </Box>
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

  // Hide initial loader when app mounts
  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (loader) {
      loader.style.display = "none";
    }
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <Helmet>
        <title>{title}</title>
        <meta
          name="description"
          content="Drumhaus is the ultimate browser controlled rhythmic groove machine. Explore web based drum sampling with limitless creativity, and share it all with your friends."
        />
        <meta property="og:title" content={title} />
        <meta
          property="og:description"
          content="Drumhaus is the ultimate browser controlled rhythmic groove machine. Explore web based drum sampling with limitless creativity, and share it all with your friends."
        />
      </Helmet>
      <AppErrorBoundary>
        <GlobalErrorHandler />
        <Box w="100vw" minH="100vh" overflow="auto">
          <Suspense fallback={<DrumhausFallback />}>
            <Drumhaus />
          </Suspense>
        </Box>
      </AppErrorBoundary>
    </ChakraProvider>
  );
}
