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
  const mode = usePatternStore((state) => state.mode);
  const setVoiceMode = usePatternStore((state) => state.setVoiceMode);

  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;

  const toggleCurrentVoice = useCallback(
    (voice: number) => {
      setVoiceMode(voice);
    },
    [setVoiceMode],
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
    <div
      ref={instrumentsRef}
      className="divide-border grid w-full grid-cols-8 divide-x px-6 py-3"
    >
      {Array.from({ length: NO_OF_INSTRUMENTS }).map((_, index) => {
        const runtime = instrumentRuntimes.current[index];

        return (
          <div
            key={`gridItem-${index}`}
            onPointerDown={() => toggleCurrentVoice(index)}
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
