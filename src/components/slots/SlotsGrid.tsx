import { Grid, GridItem } from "@chakra-ui/react";
import { Slot } from "./Slot";
import { Sample } from "@/types/types";
import { useCallback, useEffect, useRef } from "react";
import { useSequencerStore } from "@/stores/useSequencerStore";

type SlotsGridProps = {
  samples: Sample[];
  isModal: boolean;
};

const NO_OF_SLOTS = 8;

export const SlotsGrid: React.FC<SlotsGridProps> = ({
  samples,
  isModal,
}) => {
  const slotsRef = useRef<HTMLDivElement | null>(null);

  // Get state from Sequencer Store
  const slotIndex = useSequencerStore((state) => state.slotIndex);
  const setSlotIndex = useSequencerStore((state) => state.setSlotIndex);

  const toggleCurrentSequence = useCallback(
    (slot: number) => {
      setSlotIndex(slot);
    },
    [setSlotIndex]
  );

  const handleArrowKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && !isModal) {
        const newSlot = (slotIndex + 1) % 8;
        toggleCurrentSequence(newSlot);
      } else if (event.key === "ArrowLeft" && !isModal) {
        const newSlot = (slotIndex - 1 + 8) % 8;
        toggleCurrentSequence(newSlot);
      }
    },
    [isModal, slotIndex, toggleCurrentSequence]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleArrowKeyPress);
    return () => {
      window.removeEventListener("keydown", handleArrowKeyPress);
    };
  }, [handleArrowKeyPress]);

  const slotColors = [
    "#213062",
    "#e9902f",
    "#d72529",
    "#27991a",
    "#213062",
    "#e9902f",
    "#d72529",
    "#27991a",
  ];

  return (
    <Grid
      ref={slotsRef}
      key="slots"
      w="100%"
      templateColumns={`repeat(${NO_OF_SLOTS}, 1fr)`}
      boxShadow="0 4px 4px rgba(176, 147, 116, 0.0)"
    >
      {samples.map((sample, index) => (
        <GridItem
          colSpan={1}
          key={`gridItem-${index}`}
          w={`193px`}
          onMouseDown={() => toggleCurrentSequence(index)}
          transition="all 0.5s ease"
        >
          <Slot
            color={slotColors[index]}
            key={`DHSlot-${index}`}
            sample={sample}
            isModal={isModal}
            slotIndex={slotIndex}
            bg={slotIndex == index ? "#F7F1EA" : "#E8E3DD"}
          />
        </GridItem>
      ))}
    </Grid>
  );
};
