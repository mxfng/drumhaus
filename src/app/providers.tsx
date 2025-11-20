"use client";

// Import why-did-you-render in development
import { CacheProvider } from "@chakra-ui/next-js";
import { ChakraProvider } from "@chakra-ui/react";

import {
  AppErrorBoundary,
  GlobalErrorHandler,
} from "@/components/common/AppErrorBoundary";
import theme from "@/theme/theme";

if (process.env.NODE_ENV === "development") {
  require("../wdyr");
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        <AppErrorBoundary>
          <GlobalErrorHandler />
          {children}
        </AppErrorBoundary>
      </ChakraProvider>
    </CacheProvider>
  );
}
