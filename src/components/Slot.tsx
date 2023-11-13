"use client";

import { SlotData } from "@/types/types";
import { Box, Button, Heading, Text } from "@chakra-ui/react";
import "@fontsource-variable/pixelify-sans";
import { Knob } from "./Knob";

type SlotParams = {
  data: SlotData;
};

export const Slot: React.FC<SlotParams> = ({ data }) => {
  const playSample = () => {
    data.sampler.sampler.triggerAttack("C2");
  };

  return (
    <>
      <Box key={`Slot-${data.name}`} p={4}>
        <Heading className="slot" as="h2" p={2}>
          {data.name}
        </Heading>
        <Text
          key={`filename-${data.name}`}
          className="filename"
          css={{
            fontFamily: `'Pixelify Sans Variable', sans-serif`,
          }}
          p={2}
        >
          {data.sampler.url}
        </Text>
        <Button onClick={() => playSample()} m={2} />
        <Knob key={`knob1-${data.name}`} size={60} />
        <Knob key={`knob2-${data.name}`} size={60} />
        <Knob key={`knob3-${data.name}`} size={40} />
        <Knob key={`knob4-${data.name}`} size={40} />
      </Box>

      {/* Divider Line */}
      {data.id > 0 ? (
        <Box
          key={`line-${data.id}`}
          bg="gray"
          w="2px"
          h="100%"
          position="absolute"
          left={0}
          top={0}
        />
      ) : null}
    </>
  );
};
