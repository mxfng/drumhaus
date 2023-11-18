import dynamic from "next/dynamic";
import { Center } from "@chakra-ui/react";
import Scaler from "@/components/Scaler";

// Dynamically import Drumhaus component without SSR
const Drumhaus = dynamic(() => import("../components/Drumhaus"), {
  ssr: false,
});

export default function Home() {
  return (
    <>
      <Center h="100vh" w="100vw" overflowX="hidden" bg="gray">
        <Scaler>
          <Drumhaus />
        </Scaler>
      </Center>
    </>
  );
}
