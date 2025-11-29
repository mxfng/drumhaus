// Global handler for errors that React error boundaries cannot catch,

import { useEffect } from "react";

import { useToast } from "@/components/ui";

// such as event handler errors and unhandled promise rejections.
export function GlobalErrorHandler() {
  const { toast } = useToast();

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
