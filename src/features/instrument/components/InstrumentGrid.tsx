import { useCallback, useEffect, useRef } from "react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
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
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const setVoiceIndex = usePatternStore((state) => state.setVoiceIndex);

  const toggleCurrentVoice = useCallback(
    (voice: number) => {
      setVoiceIndex(voice);
    },
    [setVoiceIndex],
  );

  const handleArrowKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && !isAnyDialogOpen()) {
        const newVoice = (voiceIndex + 1) % 8;
        toggleCurrentVoice(newVoice);
      } else if (event.key === "ArrowLeft" && !isAnyDialogOpen()) {
        const newVoice = (voiceIndex - 1 + 8) % 8;
        toggleCurrentVoice(newVoice);
      }
    },
    [voiceIndex, toggleCurrentVoice, isAnyDialogOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleArrowKeyPress);
    return () => {
      window.removeEventListener("keydown", handleArrowKeyPress);
    };
  }, [handleArrowKeyPress]);

  return (
    <div ref={instrumentsRef} className="grid w-full grid-cols-8 gap-4 px-6">
      {Array.from({ length: NO_OF_INSTRUMENTS }).map((_, index) => {
        const runtime = instrumentRuntimes.current[index];

        return (
          <div
            key={`gridItem-${index}`}
            onPointerDown={() => toggleCurrentVoice(index)}
          >
            <InstrumentControl
              color={INSTRUMENT_COLORS[index]}
              key={`Instrument-${index}`}
              runtime={runtime}
              index={index}
              instrumentIndex={voiceIndex}
            />
          </div>
        );
      })}
    </div>
  );
};
