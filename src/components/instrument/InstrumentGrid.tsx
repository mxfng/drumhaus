import { useCallback, useEffect, useRef } from "react";

import { useModalStore } from "@/stores/useModalStore";
import { usePatternStore } from "@/stores/usePatternStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { InstrumentControl } from "./InstrumentControl";

const NO_OF_INSTRUMENTS = 8;

const INSTRUMENT_COLORS = [
  "#213062",
  "#e9902f",
  "#d72529",
  "#27991a",
  "#213062",
  "#e9902f",
  "#d72529",
  "#27991a",
];

type InstrumentGridProps = {
  instrumentRuntimes: InstrumentRuntime[];
};

export const InstrumentGrid: React.FC<InstrumentGridProps> = ({
  instrumentRuntimes,
}) => {
  const instrumentsRef = useRef<HTMLDivElement | null>(null);

  // Modal store
  const isAnyModalOpen = useModalStore((state) => state.isAnyModalOpen);

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
      if (event.key === "ArrowRight" && !isAnyModalOpen()) {
        const newVoice = (voiceIndex + 1) % 8;
        toggleCurrentVoice(newVoice);
      } else if (event.key === "ArrowLeft" && !isAnyModalOpen()) {
        const newVoice = (voiceIndex - 1 + 8) % 8;
        toggleCurrentVoice(newVoice);
      }
    },
    [voiceIndex, toggleCurrentVoice, isAnyModalOpen],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleArrowKeyPress);
    return () => {
      window.removeEventListener("keydown", handleArrowKeyPress);
    };
  }, [handleArrowKeyPress]);

  return (
    <div ref={instrumentsRef} className="grid w-full grid-cols-8">
      {Array.from({ length: NO_OF_INSTRUMENTS }).map((_, index) => {
        const runtime = instrumentRuntimes[index];

        return (
          <div
            key={`gridItem-${index}`}
            className="col-span-1 w-[193px] transition-all duration-500"
            onMouseDown={() => toggleCurrentVoice(index)}
          >
            <InstrumentControl
              color={INSTRUMENT_COLORS[index]}
              key={`Instrument-${index}`}
              runtime={runtime}
              index={index}
              instrumentIndex={voiceIndex}
              bg={voiceIndex == index ? "#F7F1EA" : "#E8E3DD"}
            />
          </div>
        );
      })}
    </div>
  );
};
