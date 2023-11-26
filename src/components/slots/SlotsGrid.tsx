import { Grid, GridItem } from "@chakra-ui/react";
import { Slot } from "./Slot";
import { Sample, Sequences } from "@/types/types";
import { useCallback, useEffect, useRef, useState } from "react";

type SlotsGridProps = {
  samples: Sample[];
  sequences: Sequences;
  variation: number;
  setCurrentSequence: (prevCurrentSequence: boolean[]) => void;
  slotIndex: number;
  setSlotIndex: (prevSlot: number) => void;
  attacks: number[];
  setAttacks: React.Dispatch<React.SetStateAction<number[]>>;
  releases: number[];
  setReleases: React.Dispatch<React.SetStateAction<number[]>>;
  filters: number[];
  setFilters: React.Dispatch<React.SetStateAction<number[]>>;
  volumes: number[];
  setVolumes: React.Dispatch<React.SetStateAction<number[]>>;
  pans: number[];
  setPans: React.Dispatch<React.SetStateAction<number[]>>;
  mutes: boolean[];
  setMutes: React.Dispatch<React.SetStateAction<boolean[]>>;
  solos: boolean[];
  setSolos: React.Dispatch<React.SetStateAction<boolean[]>>;
  pitches: number[];
  setPitches: React.Dispatch<React.SetStateAction<number[]>>;
  setDurations: React.Dispatch<React.SetStateAction<number[]>>;
  isModal: boolean;
};

const NO_OF_SLOTS = 8;

export const SlotsGrid: React.FC<SlotsGridProps> = ({
  samples,
  sequences,
  variation,
  setCurrentSequence,
  slotIndex,
  setSlotIndex,
  attacks,
  setAttacks,
  releases,
  setReleases,
  filters,
  setFilters,
  volumes,
  setVolumes,
  pans,
  setPans,
  mutes,
  setMutes,
  solos,
  setSolos,
  pitches,
  setPitches,
  setDurations,
  isModal,
}) => {
  const slotsRef = useRef<HTMLDivElement | null>(null);

  const toggleCurrentSequence = useCallback(
    (slot: number) => {
      setCurrentSequence(sequences[slot][variation][0]);
      setSlotIndex(slot);
    },
    [sequences, variation, setCurrentSequence, setSlotIndex]
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
            attacks={attacks}
            setAttacks={setAttacks}
            releases={releases}
            setReleases={setReleases}
            filters={filters}
            setFilters={setFilters}
            volumes={volumes}
            setVolumes={setVolumes}
            pans={pans}
            setPans={setPans}
            mutes={mutes}
            setMutes={setMutes}
            solos={solos}
            setSolos={setSolos}
            pitches={pitches}
            setPitches={setPitches}
            setDurations={setDurations}
            isModal={isModal}
            slotIndex={slotIndex}
            bg={slotIndex == index ? "#F7F1EA" : "#E8E3DD"}
          />
        </GridItem>
      ))}
    </Grid>
  );
};
