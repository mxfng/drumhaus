import { Grid, GridItem } from "@chakra-ui/react";
import { Slot } from "./Slot";
import { SlotData } from "@/types/types";
import { useEffect, useRef, useState } from "react";

type InstrumentsProps = {
  slots: SlotData[];
  sequences: boolean[][];
  setCurrentSequence: React.Dispatch<React.SetStateAction<boolean[]>>;
  setSlot: React.Dispatch<React.SetStateAction<number>>;
};

export const Instruments: React.FC<InstrumentsProps> = ({
  slots,
  sequences,
  setCurrentSequence,
  setSlot,
}) => {
  const [parentWidth, setParentWidth] = useState<number>(0);
  const instrumentsRef = useRef<HTMLDivElement | null>(null);

  const gap = 2;

  useEffect(() => {
    const handleResize = () => {
      if (instrumentsRef.current) {
        setParentWidth(instrumentsRef.current.offsetWidth);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const calculateWidth = () => {
    return parentWidth / 8 - gap;
  };

  const toggleCurrentSequence = (node: number) => {
    setCurrentSequence(sequences[node]);
    setSlot(node);
  };

  return (
    <Grid
      ref={instrumentsRef}
      key="slots"
      w="100%"
      templateColumns="repeat(8, 1fr)"
    >
      {slots.map((slotData, index) => (
        <GridItem
          colSpan={{ base: 2, xl: 1 }}
          key={`gridItem-${slotData.id}`}
          w={`${calculateWidth}`}
          overflow="hidden"
          onClick={() => toggleCurrentSequence(index)}
        >
          <Slot key={`DHSlot-${slotData.id}`} data={slotData} />
        </GridItem>
      ))}
    </Grid>
  );
};
