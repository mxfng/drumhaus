import Drumhaus from "../components/Drumhaus";
import { Center } from "@chakra-ui/react";

export default function Home() {
  return (
    <>
      <Center h="100vh" w="100vw" overflowX="hidden" bg="gray">
        <Drumhaus />
      </Center>
    </>
  );
}
