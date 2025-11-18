import { useCallback, useEffect, useRef } from "react";
import { Grid, GridItem } from "@chakra-ui/react";

import { useSequencerStore } from "@/stores/useSequencerStore";
import { Instrument } from "@/types/types";
import { InstrumentControls } from "./InstrumentControls";

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

type InstrumentsGridProps = {
  instruments: Instrument[];
  isModal: boolean;
};

export const InstrumentsGrid: React.FC<InstrumentsGridProps> = ({
  instruments,
  isModal,
}) => {
  const instrumentsRef = useRef<HTMLDivElement | null>(null);

  // Get state from Sequencer Store
  const voiceIndex = useSequencerStore((state) => state.voiceIndex);
  const setVoiceIndex = useSequencerStore((state) => state.setVoiceIndex);

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
      {instruments.map((sample, index) => (
        <GridItem
          colSpan={1}
          key={`gridItem-${index}`}
          w={`193px`}
          onMouseDown={() => toggleCurrentVoice(index)}
          transition="all 0.5s ease"
        >
          <InstrumentControls
            color={INSTRUMENT_COLORS[index]}
            key={`Instrument-${index}`}
            sample={sample}
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
