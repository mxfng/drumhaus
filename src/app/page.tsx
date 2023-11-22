import { Box, Center, Flex, Text } from "@chakra-ui/react";
import dynamic from "next/dynamic";

// Dynamically import Drumhaus component without SSR
const Drumhaus = dynamic(() => import("../components/Drumhaus"), {
  ssr: false,
});

export default function Home() {
  return (
    <Box w="100%" h="100%">
      <Box w="100%" h="100vh" minW={1538} minH={1050} position="relative">
        <Drumhaus />
      </Box>
    </Box>
  );
}
