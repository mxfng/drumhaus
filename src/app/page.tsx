import { Box, Center, Flex } from "@chakra-ui/react";
import dynamic from "next/dynamic";

// Dynamically import Drumhaus component without SSR
const Drumhaus = dynamic(() => import("../components/Drumhaus"), {
  ssr: false,
});

export default function Home() {
  return (
    <Flex w="100%" h="100vh" align="center">
      <Drumhaus />
    </Flex>
  );
}
