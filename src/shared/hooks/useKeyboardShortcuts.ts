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

  // Spacebar to play/pause (DAW-style global shortcut)
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== " ") {
        return;
      }

      // Only allow space in text inputs
      const activeElement = document.activeElement;
      const isTextInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;

      if (isTextInput) {
        return;
      }

      // Prevent space from triggering buttons/controls and scrolling page
      e.preventDefault();

      // Global play/pause unless dialog is open
      if (!isAnyDialogOpen()) {
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
