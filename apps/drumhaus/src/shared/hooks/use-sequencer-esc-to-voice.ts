import { useEffect, useEffectEvent } from "react";

import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { isTextInputFocused } from "@/shared/lib/is-text-input-focused";
import { useDialogStore } from "@/shared/store/use-dialog-store";

/**
 * Global ESC handler to reset the sequencer to voice mode from any other mode.
 */
function useSequencerEscToVoice(): void {
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

      if (isTextInputFocused()) return;

      if (isAnyDialogOpen()) return;

      handleEscape();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAnyDialogOpen]);
}

export { useSequencerEscToVoice };
