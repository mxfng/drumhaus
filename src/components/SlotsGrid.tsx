import { Grid, GridItem } from "@chakra-ui/react";
import { Slot } from "./Slot";
import { Sample, Sequences } from "@/types/types";
import { useEffect, useRef, useState } from "react";

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
  setDurations: React.Dispatch<React.SetStateAction<number[]>>;
};

const SLOTS_GAP = 2;
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
  setDurations,
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
    setCurrentSequence(sequences[node][variation][0]);
    setSlotIndex(node);
  };

  const waveColors = [
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
          w={`${slotW}`}
          overflow="hidden"
          onMouseDown={() => toggleCurrentSequence(index)}
          transition="all 0.5s ease"
          bg={slotIndex == index ? "rgba(255, 255, 255, 0.05)" : "transparent"}
          // opacity={slotIndex == index ? 1 : 0.7}
          _hover={{
            opacity: 1,
          }}
        >
          <Slot
            color={waveColors[index]}
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
            setDurations={setDurations}
            bg={slotIndex == index ? "#F7F1EA" : "#E8E3DD"}
          />
        </GridItem>
      ))}
    </Grid>
  );
};
