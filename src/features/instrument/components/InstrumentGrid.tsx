import { useCallback, useEffect, useRef } from "react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { isSameAsSource } from "@/features/sequencer/lib/clipboard";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { INSTRUMENT_COLORS } from "../lib/colors";
import { InstrumentControl } from "./InstrumentControl";

const NO_OF_INSTRUMENTS = 8;

export const InstrumentGrid: React.FC = () => {
  const { instrumentRuntimes } = useDrumhaus();
  const instrumentsRef = useRef<HTMLDivElement | null>(null);

  // Dialog store
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);

  // Get state from Sequencer Store
  const mode = usePatternStore((state) => state.mode);
  const variation = usePatternStore((state) => state.variation);
  const setVoiceMode = usePatternStore((state) => state.setVoiceMode);

  // Copy/paste state
  const clipboard = usePatternStore((state) => state.clipboard);
  const copySource = usePatternStore((state) => state.copySource);
  const copyInstrument = usePatternStore((state) => state.copyInstrument);
  const pasteToInstrument = usePatternStore((state) => state.pasteToInstrument);
  const exitCopyPasteMode = usePatternStore((state) => state.exitCopyPasteMode);
  const clearInstrument = usePatternStore((state) => state.clearInstrument);

  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;
  const isCopyMode = mode.type === "copy";
  const isPasteMode = mode.type === "paste";
  const isClearMode = mode.type === "clear";

  const handleInstrumentClick = useCallback(
    (index: number) => {
      if (isClearMode) {
        clearInstrument(index);
        return;
      }

      if (isCopyMode) {
        // Copy this instrument's pattern
        copyInstrument(index);
      } else if (isPasteMode && clipboard?.type === "instrument") {
        // Check if this is not the source (for same variation)
        const isSource =
          copySource &&
          isSameAsSource(copySource, "instrument", index, variation);
        if (!isSource) {
          pasteToInstrument(index);
        }
      } else {
        // Normal mode: select this voice
        setVoiceMode(index);
      }
    },
    [
      isCopyMode,
      isPasteMode,
      isClearMode,
      clipboard,
      copySource,
      variation,
      copyInstrument,
      pasteToInstrument,
      clearInstrument,
      setVoiceMode,
    ],
  );

  const toggleCurrentVoice = useCallback(
    (voice: number) => {
      setVoiceMode(voice);
    },
    [setVoiceMode],
  );

  // Useful keyboard shortcuts for navigating the instrument grid
  const handleArrowKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const newVoiceRight = (voiceIndex: number) => (voiceIndex + 1) % 8;
      const newVoiceLeft = (voiceIndex: number) => (voiceIndex - 1 + 8) % 8;
      const newVoiceUp = (voiceIndex: number) => (voiceIndex - 2 + 8) % 8;
      const newVoiceDown = (voiceIndex: number) => (voiceIndex + 2) % 8;

      if (isAnyDialogOpen()) return;

      // ESC cancels copy/paste/clear modes
      if (
        event.key === "Escape" &&
        (isCopyMode || isPasteMode || isClearMode)
      ) {
        exitCopyPasteMode();
        return;
      }

      if (event.key === "ArrowRight") {
        toggleCurrentVoice(newVoiceRight(voiceIndex));
      } else if (event.key === "ArrowLeft") {
        toggleCurrentVoice(newVoiceLeft(voiceIndex));
      } else if (event.key === "h") {
        toggleCurrentVoice(newVoiceLeft(voiceIndex));
      } else if (event.key === "l") {
        toggleCurrentVoice(newVoiceRight(voiceIndex));
      } else if (event.key === "j") {
        toggleCurrentVoice(newVoiceDown(voiceIndex));
      } else if (event.key === "k") {
        toggleCurrentVoice(newVoiceUp(voiceIndex));
      } else if (event.key === "1") {
        toggleCurrentVoice(0);
      } else if (event.key === "2") {
        toggleCurrentVoice(1);
      } else if (event.key === "3") {
        toggleCurrentVoice(2);
      } else if (event.key === "4") {
        toggleCurrentVoice(3);
      } else if (event.key === "5") {
        toggleCurrentVoice(4);
      } else if (event.key === "6") {
        toggleCurrentVoice(5);
      } else if (event.key === "7") {
        toggleCurrentVoice(6);
      } else if (event.key === "8") {
        toggleCurrentVoice(7);
      }
    },
    [
      voiceIndex,
      toggleCurrentVoice,
      isAnyDialogOpen,
      isCopyMode,
      isPasteMode,
      isClearMode,
      exitCopyPasteMode,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleArrowKeyPress);
    return () => {
      window.removeEventListener("keydown", handleArrowKeyPress);
    };
  }, [handleArrowKeyPress]);

  return (
    <div
      ref={instrumentsRef}
      className="divide-border grid w-full grid-cols-8 divide-x px-6 py-3"
    >
      {Array.from({ length: NO_OF_INSTRUMENTS }).map((_, index) => {
        const runtime = instrumentRuntimes.current[index];

        return (
          <div
            key={`gridItem-${index}`}
            onPointerDown={() => handleInstrumentClick(index)}
            className="px-2"
          >
            <InstrumentControl
              color={INSTRUMENT_COLORS[index]}
              key={`Instrument-${index}`}
              runtime={runtime}
              index={index}
            />
          </div>
        );
      })}
    </div>
  );
};
