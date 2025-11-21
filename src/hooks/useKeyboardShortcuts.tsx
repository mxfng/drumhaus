import { RefObject, useEffect } from "react";

import { useModalStore } from "@/stores/useModalStore";
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
  const isAnyModalOpen = useModalStore((state) => state.isAnyModalOpen);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  // Spacebar to play/pause
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === " " && !isAnyModalOpen() && !isLoading) {
        togglePlay(instrumentRuntimes.current);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [
    isAnyModalOpen,
    isLoading,
    instrumentRuntimes,
    instrumentRuntimesVersion,
    togglePlay,
  ]);
}
