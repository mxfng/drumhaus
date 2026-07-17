import { useEffect } from "react";

import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { isTextInputFocused } from "@/shared/lib/is-text-input-focused";
import { useDialogStore } from "@/shared/store/use-dialog-store";

function useSpacebarTogglePlay() {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== " ") return;

      if (isTextInputFocused()) return;

      e.preventDefault();

      if (!isAnyDialogOpen()) {
        void togglePlay();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isAnyDialogOpen, togglePlay]);
}

export { useSpacebarTogglePlay };
