import { useEffect } from "react";

import { applyBodyStyleOverrides } from "./utils/bodyStyle";

/**
 * Locks body scroll when active, similar to Radix Dialog's scroll blocking.
 * Prevents both scrolling and pull-to-refresh on mobile, including iOS Safari.
 * Based on react-remove-scroll implementation.
 *
 * Elements with the `data-scrollable` attribute will remain scrollable even when
 * the scroll lock is active. This allows for scrollable content within the locked view.
 *
 * @example
 * // Mark an element as scrollable:
 * <div data-scrollable className="overflow-y-auto">
 *   Scrollable content here
 * </div>
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Get scrollbar width to prevent layout shift
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    const restoreBodyStyles = applyBodyStyleOverrides({
      overflow: "hidden",
      "touch-action": "none",
      "overscroll-behavior": "contain",
      ...(scrollbarWidth > 0 ? { "padding-right": `${scrollbarWidth}px` } : {}),
    });

    // Check if passive event listeners are supported
    let passiveSupported = false;
    try {
      const options = Object.defineProperty({}, "passive", {
        get: function () {
          passiveSupported = true;
          return true;
        },
      });
      window.addEventListener(
        "test",
        null as unknown as EventListener,
        options,
      );
      window.removeEventListener(
        "test",
        null as unknown as EventListener,
        options,
      );
    } catch {
      passiveSupported = false;
    }

    const nonPassive = passiveSupported ? { passive: false } : false;

    // Check if element or any parent has data-scrollable attribute
    const isScrollableElement = (element: EventTarget | null): boolean => {
      if (!element || !(element instanceof Element)) return false;

      let current: Element | null = element;
      while (current) {
        if (current.hasAttribute("data-scrollable")) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };

    // Prevent touch events that cause scrolling
    // This is crucial for iOS which ignores overflow:hidden on body
    const preventScroll = (e: TouchEvent | WheelEvent) => {
      // Allow scrolling within elements marked as scrollable
      if (isScrollableElement(e.target)) {
        return;
      }

      // Allow pinch-to-zoom
      if (e instanceof TouchEvent && e.touches.length > 1) {
        return;
      }

      // Allow ctrl+wheel (zoom)
      if (e instanceof WheelEvent && e.ctrlKey) {
        return;
      }

      e.preventDefault();
    };

    // Add event listeners to prevent default scroll behavior
    document.addEventListener("touchmove", preventScroll, nonPassive);
    document.addEventListener("wheel", preventScroll, nonPassive);

    return () => {
      restoreBodyStyles();

      // Remove event listeners
      document.removeEventListener(
        "touchmove",
        preventScroll,
        nonPassive as unknown as AddEventListenerOptions,
      );
      document.removeEventListener(
        "wheel",
        preventScroll,
        nonPassive as unknown as AddEventListenerOptions,
      );
    };
  }, [isLocked]);
}
