import { RefObject, useEffect } from "react";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { useDialogStore } from "@/shared/store/useDialogStore";

interface UseKeyboardShortcutsProps {
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
}

export function useKeyboardShortcuts({
  instrumentRuntimes,
  instrumentRuntimesVersion,
}: UseKeyboardShortcutsProps) {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  // Spacebar to play/pause
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Don't intercept Space if an interactive element is focused
      const activeElement = document.activeElement;
      const isInteractiveElementFocused =
        activeElement instanceof HTMLButtonElement ||
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement?.getAttribute("role") === "slider" ||
        activeElement?.hasAttribute("tabindex");

      if (e.key === " " && !isAnyDialogOpen() && !isInteractiveElementFocused) {
        e.preventDefault(); // Prevent page scroll
        togglePlay(instrumentRuntimes.current);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [
    isAnyDialogOpen,
    instrumentRuntimes,
    instrumentRuntimesVersion,
    togglePlay,
  ]);
}
