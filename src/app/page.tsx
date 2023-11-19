import { Center } from "@chakra-ui/react";
import dynamic from "next/dynamic";

// Dynamically import Drumhaus component without SSR
const Drumhaus = dynamic(() => import("../components/Drumhaus"), {
  ssr: false,
});

export default function Home() {
  return (
    <Center w="100%" h="100vh">
      <Drumhaus />
    </Center>
  );
}
