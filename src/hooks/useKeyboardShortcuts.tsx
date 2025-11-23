import { RefObject, useEffect } from "react";

import { useDialogStore } from "@/stores/useDialogStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";

interface UseKeyboardShortcutsProps {
  isLoading: boolean;
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
}

export function useKeyboardShortcuts({
  isLoading,
  instrumentRuntimes,
  instrumentRuntimesVersion,
}: UseKeyboardShortcutsProps) {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  // Spacebar to play/pause
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === " " && !isAnyDialogOpen() && !isLoading) {
        togglePlay(instrumentRuntimes.current);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [
    isAnyDialogOpen,
    isLoading,
    instrumentRuntimes,
    instrumentRuntimesVersion,
    togglePlay,
  ]);
}
