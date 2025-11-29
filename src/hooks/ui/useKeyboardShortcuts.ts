import { RefObject, useEffect } from "react";

import type { InstrumentRuntime } from "@/features/instruments/types/instrument";
import { useDialogStore } from "@/stores/useDialogStore";
import { useTransportStore } from "@/stores/useTransportStore";

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
      if (e.key === " " && !isAnyDialogOpen()) {
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
