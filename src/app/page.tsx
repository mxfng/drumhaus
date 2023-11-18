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
      <Center
        h="100vh"
        w="100vw"
        overflowX="hidden"
        bg="#ff99fa"
        backgroundImage="radial-gradient(at 26% 52%, hsla(235,95%,67%,1) 0px, transparent 50%),
radial-gradient(at 2% 39%, hsla(230,84%,61%,1) 0px, transparent 50%),
radial-gradient(at 74% 11%, hsla(28,76%,69%,1) 0px, transparent 50%),
radial-gradient(at 53% 5%, hsla(264,75%,63%,1) 0px, transparent 50%),
radial-gradient(at 31% 25%, hsla(93,60%,61%,1) 0px, transparent 50%),
radial-gradient(at 29% 54%, hsla(345,63%,69%,1) 0px, transparent 50%),
radial-gradient(at 40% 73%, hsla(89,63%,74%,1) 0px, transparent 50%);"
      >
        <Scaler>
          <Drumhaus />
        </Scaler>
      </Center>
    </>
  );
}
