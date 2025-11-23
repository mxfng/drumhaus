import { useEffect } from "react";

import { useDialogStore } from "@/stores/useDialogStore";

// Check if running in browser and detect mobile device
const isMobileDevice = () => {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};

export function useMobileWarning(): void {
  const openDialog = useDialogStore((state) => state.openDialog);

  useEffect(() => {
    if (isMobileDevice()) {
      openDialog("mobile");
    }
  }, [openDialog]);
}
