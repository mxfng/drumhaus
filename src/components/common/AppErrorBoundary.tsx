import React, { useEffect } from "react";
import { useToast } from "@chakra-ui/react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryInnerProps = {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundaryInner extends React.Component<
  AppErrorBoundaryInnerProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Uncaught application error:", error, info);

    if (this.props.onError) {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const toast = useToast();

  return (
    <AppErrorBoundaryInner
      onError={(error) => {
        toast({
          title: "Something went wrong.",
          description: error.message,
          status: "error",
          duration: 8000,
          isClosable: true,
          position: "top",
        });
      }}
    >
      {children}
    </AppErrorBoundaryInner>
  );
}

// Global handler for errors that React error boundaries cannot catch,
// such as event handler errors and unhandled promise rejections.
export function GlobalErrorHandler() {
  const toast = useToast();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message =
        event.error?.message ||
        event.message ||
        "An unexpected error occurred.";

      toast({
        title: "Something went wrong.",
        description: message,
        status: "error",
        duration: 8000,
        isClosable: true,
        position: "top",
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason?.message || "An unexpected error occurred.";

      toast({
        title: "Something went wrong.",
        description: message,
        status: "error",
        duration: 8000,
        isClosable: true,
        position: "top",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, [toast]);

  return null;
}
