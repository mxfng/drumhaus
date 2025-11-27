import { useEffect } from "react";

/**
 * Registers the Drumhaus service worker in supported environments.
 *
 * - No framework-specific APIs; safe to reuse in a future Vite setup.
 * - Only runs in the browser and in secure contexts (HTTPS or localhost).
 */
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    const isSecure = window.location.protocol === "https:" || isLocalhost;

    if (!isSecure) {
      return;
    }

    const swUrl = "/service-worker.js";

    navigator.serviceWorker
      .register(swUrl)
      .catch((error) =>
        console.error("Service worker registration failed:", error),
      );
  }, []);
}
