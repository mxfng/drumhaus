import { useEffect, useEffectEvent } from "react";

type InstrumentGridShortcutsOptions = {
  voiceIndex: number;
  onSelectVoice: (voiceIndex: number) => void;
  isAnyDialogOpen: () => boolean;
};

/**
 * Keyboard navigation for the 8-slot instrument grid.
 * Supports arrows, vim keys (h/j/k/l), and number keys 1-8.
 */
export function useInstrumentGridShortcuts({
  voiceIndex,
  onSelectVoice,
  isAnyDialogOpen,
}: InstrumentGridShortcutsOptions): void {
  const selectVoice = useEffectEvent((voice: number) => {
    onSelectVoice(voice);
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isAnyDialogOpen()) return;

      const newVoiceRight = (idx: number) => (idx + 1) % 8;
      const newVoiceLeft = (idx: number) => (idx - 1 + 8) % 8;
      const newVoiceUp = (idx: number) => (idx - 2 + 8) % 8;
      const newVoiceDown = (idx: number) => (idx + 2) % 8;

      if (event.key === "ArrowRight") {
        selectVoice(newVoiceRight(voiceIndex));
      } else if (event.key === "ArrowLeft") {
        selectVoice(newVoiceLeft(voiceIndex));
      } else if (event.key === "h") {
        selectVoice(newVoiceLeft(voiceIndex));
      } else if (event.key === "l") {
        selectVoice(newVoiceRight(voiceIndex));
      } else if (event.key === "j") {
        selectVoice(newVoiceDown(voiceIndex));
      } else if (event.key === "k") {
        selectVoice(newVoiceUp(voiceIndex));
      } else if (event.key >= "1" && event.key <= "8") {
        const number = Number(event.key) - 1; // 0-based
        selectVoice(number);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [voiceIndex, isAnyDialogOpen]);
}
