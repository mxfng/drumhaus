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
