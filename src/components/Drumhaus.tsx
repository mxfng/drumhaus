"use client";

import { sample } from "@/lib/sample";
import { Box, Button, Center, Heading } from "@chakra-ui/react";
import { useEffect } from "react";

const Drumhaus = () => {
  return (
    <>
      <Center h="100vh">
        <Box w="fit-content">
          <Heading>Drumhaus</Heading>
          <Button onClick={() => sample()}>Play</Button>
        </Box>
      </Center>
    </>
  );
};

export default Drumhaus;
