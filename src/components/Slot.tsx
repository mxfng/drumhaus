import { SlotData } from "@/types/types";
import { Text } from "@chakra-ui/react";

type SlotParams = {
  data: SlotData;
};

export const Slot: React.FC<SlotParams> = ({ data }) => {
  return (
    <>
      <Text>{data.name}</Text>
    </>
  );
};
