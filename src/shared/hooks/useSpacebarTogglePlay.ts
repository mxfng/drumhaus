import { RefObject, useEffect } from "react";

import { InstrumentRuntime } from "@/core/audio/engine/instrument/types";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { useDialogStore } from "@/shared/store/useDialogStore";

interface UseSpacebarTogglePlayProps {
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
}

export function useSpacebarTogglePlay({
  instrumentRuntimes,
  instrumentRuntimesVersion,
}: UseSpacebarTogglePlayProps) {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== " ") return;

      const activeElement = document.activeElement;
      const isTextInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement instanceof HTMLElement &&
          activeElement.isContentEditable);

      if (isTextInput) return;

      e.preventDefault();

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
