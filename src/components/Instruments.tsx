import { Grid, GridItem } from "@chakra-ui/react";
import { Slot } from "./Slot";
import { SlotData } from "@/types/types";
import { useEffect, useRef, useState } from "react";

type InstrumentsProps = {
  slots: SlotData[];
};

export const Instruments: React.FC<InstrumentsProps> = ({ slots }) => {
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
    handleResize(); // Initial sizing

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const calculateWidth = () => {
    return parentWidth / 8 - gap;
  };

  return (
    <Grid
      ref={instrumentsRef}
      key="slots"
      w="100%"
      templateColumns="repeat(8, 1fr)"
    >
      {slots.map((slotData) => (
        <GridItem
          colSpan={{ base: 2, md: 1 }}
          key={`gridItem-${slotData.id}`}
          w={`${calculateWidth}`}
        >
          <Slot key={`DHSlot-${slotData.id}`} data={slotData} />
        </GridItem>
      ))}
    </Grid>
  );
};
