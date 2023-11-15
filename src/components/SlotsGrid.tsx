import { Grid, GridItem } from "@chakra-ui/react";
import { Slot } from "./Slot";
import { SlotData } from "@/types/types";
import { useEffect, useRef, useState } from "react";

type SlotsGridProps = {
  slots: SlotData[];
  sequences: boolean[][];
  setCurrentSequence: (prevCurrentSequence: boolean[]) => void;
  slotIndex: number;
  setSlotIndex: (prevSlot: number) => void;
  setReleases: React.Dispatch<React.SetStateAction<number[]>>;
};

const SLOTS_GAP = 2;
const NO_OF_SLOTS = 8;

export const SlotsGrid: React.FC<SlotsGridProps> = ({
  slots,
  sequences,
  setCurrentSequence,
  slotIndex,
  setSlotIndex,
  setReleases,
}) => {
  const [parentW, setParentW] = useState<number>(0);
  const slotsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const getParentWOnResize = () => {
      if (slotsRef.current) {
        setParentW(slotsRef.current.offsetWidth);
      }
    };

    window.addEventListener("resize", getParentWOnResize);
    getParentWOnResize();

    return () => {
      window.removeEventListener("resize", getParentWOnResize);
    };
  }, []);

  const slotW = () => {
    return parentW / 8 - SLOTS_GAP;
  };

  const toggleCurrentSequence = (node: number) => {
    setCurrentSequence(sequences[node]);
    setSlotIndex(node);
  };

  return (
    <Grid
      ref={slotsRef}
      key="slots"
      w="100%"
      templateColumns={`repeat(${NO_OF_SLOTS}, 1fr)`}
    >
      {slots.map((slotData, index) => (
        <GridItem
          colSpan={{ base: 2, xl: 1 }}
          key={`gridItem-${slotData.id}`}
          w={`${slotW}`}
          overflow="hidden"
          onMouseDown={() => toggleCurrentSequence(index)}
          transition="all 0.5s ease"
          bg={slotIndex == index ? "rgba(255, 255, 255, 0.05)" : "transparent"}
          boxShadow={slotIndex == index ? "0 4px 4px rgba(0, 0, 0, 0.1)" : ""}
          opacity={slotIndex == index ? 1 : 0.7}
          _hover={{
            opacity: 1,
          }}
        >
          <Slot
            key={`DHSlot-${slotData.id}`}
            data={slotData}
            setReleases={setReleases}
          />
        </GridItem>
      ))}
    </Grid>
  );
};
