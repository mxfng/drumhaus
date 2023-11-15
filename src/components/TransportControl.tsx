import { Box, Center, Flex } from "@chakra-ui/react";
import { Knob } from "./Knob";

type TransportControlProps = {
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  swing: number;
  setSwing: React.Dispatch<React.SetStateAction<number>>;
};

export const TransportControl: React.FC<TransportControlProps> = ({
  bpm,
  setBpm,
  swing,
  setSwing,
}) => {
  return (
    <>
      <Center h="100%" px={6}>
        <Flex>
          <Center>
            <Box bg="tomato" w="200px" h="80px" />
          </Center>

          <Knob
            size={80}
            knobValue={swing}
            setKnobValue={setSwing}
            knobTitle="SWING"
          />
        </Flex>
      </Center>
    </>
  );
};
