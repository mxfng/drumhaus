import Scaler from "@/components/Scaler";
import Drumhaus from "../components/Drumhaus";
import { Center } from "@chakra-ui/react";

export default function Home() {
  return (
    <>
      <Center h="100vh" w="100vw" overflow="hidden" bg="gray">
        <Drumhaus />
      </Center>
    </>
  );
}
