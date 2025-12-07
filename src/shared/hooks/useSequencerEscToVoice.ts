import { useEffect, useEffectEvent } from "react";

import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useDialogStore } from "@/shared/store/useDialogStore";

/**
 * Global ESC handler to reset the sequencer to voice mode from any other mode.
 */
export function useSequencerEscToVoice(): void {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);
  const setMode = usePatternStore((state) => state.setMode);

  const handleEscape = useEffectEvent(() => {
    const { mode, voiceIndex } = usePatternStore.getState();
    if (mode.type !== "voice") {
      setMode({ type: "voice", voiceIndex });
    }
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      // Ignore when typing in inputs/content-editables
      const activeElement = document.activeElement;
      const isTextInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement instanceof HTMLElement &&
          activeElement.isContentEditable);
      if (isTextInput) return;

      if (isAnyDialogOpen()) return;

      handleEscape();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAnyDialogOpen]);
}
