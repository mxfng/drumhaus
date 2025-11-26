import { useEffect, useMemo } from "react";

import { useDialogStore } from "@/stores/useDialogStore";

export function useMobileWarning(): boolean {
  const openDialog = useDialogStore((state) => state.openDialog);

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }, []);

  useEffect(() => {
    if (isMobile) {
      openDialog("mobile");
    }
  }, [openDialog, isMobile]);

  return isMobile;
}
