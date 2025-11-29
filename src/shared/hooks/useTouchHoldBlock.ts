import { useEffect } from "react";

import { applyBodyStyleOverrides } from "./utils/bodyStyle";

/**
 * Blocks long-press text selection/callouts on touch devices while active.
 * Elements marked with `data-allow-selection` keep the default behavior so we
 * can opt specific inputs/fields back in.
 */
export function useTouchHoldBlock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const restoreBodyStyles = applyBodyStyleOverrides({
      "user-select": "none",
      "-webkit-user-select": "none",
      "-webkit-touch-callout": "none",
    });

    const allowSelector =
      "[data-allow-selection], input, textarea, [contenteditable=true]";

    const isAllowed = (target: EventTarget | null) => {
      return (
        target instanceof Element && target.closest(allowSelector) !== null
      );
    };

    const preventSelect = (e: Event) => {
      if (isAllowed(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("selectstart", preventSelect, { passive: false });
    document.addEventListener("contextmenu", preventSelect, { passive: false });

    return () => {
      restoreBodyStyles();
      document.removeEventListener("selectstart", preventSelect);
      document.removeEventListener("contextmenu", preventSelect);
    };
  }, [enabled]);
}
