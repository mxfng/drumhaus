import { Suspense } from "react";
import { Box } from "@chakra-ui/react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

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

function getPresetTitleFromSlug(slug: string | string[] | undefined): string {
  if (!slug) return "Drumhaus";

  const raw =
    typeof slug === "string" ? slug : slug.length > 0 ? slug[0] : undefined;

  if (!raw) return "Drumhaus";

  try {
    const decoded = decodeURIComponent(raw);
    const words = decoded
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    if (words.length === 0) return "Drumhaus";

    return `Drumhaus | ${words.join(" ")}`;
  } catch {
    return "Drumhaus";
  }
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const title = getPresetTitleFromSlug(searchParams.n);

  return {
    title,
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
      title,
      description:
        "Drumhaus is the ultimate browser controlled rhythmic groove machine. Explore web based drum sampling with limitless creativity, and share it all with your friends.",
      images: "/opengraph-image.png",
    },
    metadataBase: new URL("https://www.drumha.us/"),
  };
}

export default function Home() {
  return (
    <Box w="100vw" minH="100vh" overflow="auto">
      <Suspense fallback={<DrumhausFallback />}>
        <Drumhaus />
      </Suspense>
    </Box>
  );
}
