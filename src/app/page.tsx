import { Box } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import Drumhaus component without SSR
const Drumhaus = dynamic(() => import("../components/Drumhaus"), {
  ssr: false,
});

function DrumhausFallback() {
  return <></>;
}

export default function Home() {
  return (
    <Box w="100%" h="100%">
      <Box w="100%" h="100vh" minW={1538} minH={1050} position="relative">
        <Suspense fallback={<DrumhausFallback />}>
          <Drumhaus />
        </Suspense>
      </Box>
    </Box>
  );
}
