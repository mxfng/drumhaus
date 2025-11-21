// This file is no longer needed in Vite - providers are set up in App.tsx
// Kept for reference during migration

import { ChakraProvider } from "@chakra-ui/react";

import {
  AppErrorBoundary,
  GlobalErrorHandler,
} from "@/components/common/AppErrorBoundary";
import theme from "@/theme/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <AppErrorBoundary>
        <GlobalErrorHandler />
        {children}
      </AppErrorBoundary>
    </ChakraProvider>
  );
}
