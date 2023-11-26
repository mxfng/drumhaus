import { Box } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Metadata, ResolvingMetadata } from "next";

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

// Dynamically import Drumhaus component without SSR
const Drumhaus = dynamic(() => import("../components/Drumhaus"), {
  ssr: false,
});

function DrumhausFallback() {
  return <></>;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  let title: string;

  const presetKey = searchParams.preset;

  try {
    if (presetKey) {
      // This depends on the availability of Drumhaus' host
      const response = await fetch(
        `https://www.drumha.us/api/presets?preset_key=${presetKey}`
      );

      const data = await response.json();

      if (data.presets.rows[0]) {
        title = `Drumhaus | ${data.presets.rows[0].preset_data.name}`;
      } else {
        title = "Drumhaus";
      }
    } else {
      title = "Drumhaus";
    }
  } catch (error) {
    title = "Drumhaus";
    console.error(
      `There was an error while fetching the title for the provided preset_key ${presetKey}`,
      error
    );
  }

  return {
    title: title,

    description:
      "Drumhaus is the ultimate browser controlled rhythmic groove machine. Explore web based drum sampling with limitless creativity, and share it all with your friends.",

    keywords: [
      "Drumhaus",
      "drum machine",
      "online drum machine",
      "web based drum machine",
      "free online drum machine",
      "browser controlled drum machine",
      "online sampler",
      "browser sampler",
      "digital audio workstation",
      "DAW",
      "online DAW",
      "music software",
      "drum haus",
      "drums",
      "bauhaus",
      "samples",
      "drum samples",
      "online drum maker",
      "web based",
      "music",
      "creative",
      "code",
      "software engineer",
      "software",
      "Max Fung",
    ],

    creator: "Max Fung",

    category: "music",

    openGraph: {
      title: title,
      description:
        "Drumhaus is the ultimate browser controlled rhythmic groove machine. Explore web based drum sampling with limitless creativity, and share it all with your friends.",
      images: "/opengraph-image.png",
    },

    metadataBase: new URL("https://www.drumha.us/"),
  };
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
