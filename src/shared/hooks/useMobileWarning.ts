import { useEffect, useState } from "react";

import { useDialogStore } from "@/shared/store/useDialogStore";

const MOBILE_COMPONENT_BREAKPOINT = 640;
const MOBILE_WARNING_BREAKPOINT = 1024; // pixels

function isMobileOrTabletDevice(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent.toLowerCase();

  // Check for mobile/tablet indicators in user agent
  const mobileKeywords = [
    "android",
    "webos",
    "iphone",
    "ipad",
    "ipod",
    "blackberry",
    "windows phone",
    "mobile",
    "tablet",
  ];

  return mobileKeywords.some((keyword) => userAgent.includes(keyword));
}

export function useMobileWarning(): boolean {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);

  // Check if viewport width is below mobile component breakpoint (for rendering mobile component)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_COMPONENT_BREAKPOINT;
  });

  // Check if viewport should show warning (below warning breakpoint or portrait, but only on mobile/tablet devices)
  const [shouldShowWarning, setShouldShowWarning] = useState(() => {
    if (typeof window === "undefined") return false;
    const isMobileDevice = isMobileOrTabletDevice();
    return (
      isMobileDevice &&
      (window.innerWidth < MOBILE_WARNING_BREAKPOINT ||
        window.innerHeight > window.innerWidth)
    );
  });

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < MOBILE_COMPONENT_BREAKPOINT);
      const isMobileDevice = isMobileOrTabletDevice();
      setShouldShowWarning(
        isMobileDevice &&
          (window.innerWidth < MOBILE_WARNING_BREAKPOINT ||
            window.innerHeight > window.innerWidth),
      );
    };

    // Listen for resize and orientation changes
    window.addEventListener("resize", checkViewport);
    window.addEventListener("orientationchange", checkViewport);

    return () => {
      window.removeEventListener("resize", checkViewport);
      window.removeEventListener("orientationchange", checkViewport);
    };
  }, []);

  // Show dialog when warning condition is met
  useEffect(() => {
    if (shouldShowWarning) {
      openDialog("mobile");
    } else {
      closeDialog();
    }
  }, [openDialog, shouldShowWarning, closeDialog]);

  return isMobile;
}
