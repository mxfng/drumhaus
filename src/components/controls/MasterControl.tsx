import { GridItem } from "@chakra-ui/react";

import { MasterCompressor } from "./master/MasterCompressor";
import { MasterFX } from "./master/MasterFX";
import { MasterVolume } from "./master/MasterVolume";

export const MasterControl: React.FC = () => {
  return (
    <>
      <GridItem colSpan={1} w={120} pl={8} pr={4}>
        <MasterFX />
      </GridItem>

      <GridItem colSpan={1} px={4}>
        <MasterCompressor />
      </GridItem>

      <GridItem colSpan={1} w={140}>
        <MasterVolume />
      </GridItem>
    </>
  );
};
