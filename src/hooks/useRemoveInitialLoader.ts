import { useEffect } from "react";

/**
 * Removes the initial loader element (with id "initial-loader") from the DOM
 * after the app has mounted.
 */
export function useRemoveInitialLoader() {
  // Remove initial loader
  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (!loader) return;

    loader.classList.add("initial-loader--hidden");

    const timeout = window.setTimeout(() => {
      requestAnimationFrame(() => {
        loader.remove();
      });
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);
}
