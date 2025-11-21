import { useCallback, useEffect, useRef } from "react";
import { Grid, GridItem } from "@chakra-ui/react";

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
    <Grid
      ref={instrumentsRef}
      key="instruments-grid"
      w="100%"
      templateColumns={`repeat(${NO_OF_INSTRUMENTS}, 1fr)`}
      boxShadow="0 4px 4px rgba(176, 147, 116, 0.0)"
    >
      {Array.from({ length: NO_OF_INSTRUMENTS }).map((_, index) => {
        const runtime = instrumentRuntimes[index];

        return (
          <GridItem
            colSpan={1}
            key={`gridItem-${index}`}
            w={`193px`}
            onMouseDown={() => toggleCurrentVoice(index)}
            transition="all 0.5s ease"
          >
            <InstrumentControl
              color={INSTRUMENT_COLORS[index]}
              key={`Instrument-${index}`}
              runtime={runtime}
              index={index}
              instrumentIndex={voiceIndex}
              bg={voiceIndex == index ? "#F7F1EA" : "#E8E3DD"}
            />
          </GridItem>
        );
      })}
    </Grid>
  );
};
