import { useEffect, useState } from "react";

import { useDialogStore } from "@/stores/useDialogStore";

export function useMobileWarning(): boolean {
  const openDialog = useDialogStore((state) => state.openDialog);

  // Check if the viewport is in portrait orientation (height > width)
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    // Listen for resize and orientation changes
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  useEffect(() => {
    if (isPortrait) {
      openDialog("mobile");
    }
  }, [openDialog, isPortrait]);

  return isPortrait;
}
