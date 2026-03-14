import { useCallback, useRef } from "react";

import { useDrumhaus } from "@/core/providers/drumhaus-provider";
import { useInstrumentGridShortcuts } from "@/features/instrument/hooks/use-instrument-grid-shortcuts";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useDialogStore } from "@/shared/store/use-dialog-store";
import { INSTRUMENT_COLORS } from "../lib/colors";
import { InstrumentControl } from "./instrument-control";

const NO_OF_INSTRUMENTS = 8;

export function InstrumentGrid() {
  const { instrumentRuntimes } = useDrumhaus();
  const instrumentsRef = useRef<HTMLDivElement | null>(null);

  // Dialog store
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);

  // Get state from Sequencer Store
  const mode = usePatternStore((state) => state.mode);
  const setVoiceMode = usePatternStore((state) => state.setVoiceMode);

  // Copy/paste state
  const clipboard = usePatternStore((state) => state.clipboard);
  const copyInstrument = usePatternStore((state) => state.copyInstrument);
  const pasteToInstrument = usePatternStore((state) => state.pasteToInstrument);
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
        pasteToInstrument(index);
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

  useInstrumentGridShortcuts({
    voiceIndex,
    onSelectVoice: toggleCurrentVoice,
    isAnyDialogOpen,
  });

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
}
