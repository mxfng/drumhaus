import { useCallback, useEffect, useRef } from "react";
import { Grid, GridItem } from "@chakra-ui/react";

import { usePatternStore } from "@/stores/usePatternStore";
import { InstrumentRuntime } from "@/types/types";
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
  isModal: boolean;
};

export const InstrumentGrid: React.FC<InstrumentGridProps> = ({
  instrumentRuntimes,
  isModal,
}) => {
  const instrumentsRef = useRef<HTMLDivElement | null>(null);

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
      if (event.key === "ArrowRight" && !isModal) {
        const newVoice = (voiceIndex + 1) % 8;
        toggleCurrentVoice(newVoice);
      } else if (event.key === "ArrowLeft" && !isModal) {
        const newVoice = (voiceIndex - 1 + 8) % 8;
        toggleCurrentVoice(newVoice);
      }
    },
    [isModal, voiceIndex, toggleCurrentVoice],
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
      {instrumentRuntimes.map((runtime, index) => (
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
            isModal={isModal}
            instrumentIndex={voiceIndex}
            bg={voiceIndex == index ? "#F7F1EA" : "#E8E3DD"}
          />
        </GridItem>
      ))}
    </Grid>
  );
};
