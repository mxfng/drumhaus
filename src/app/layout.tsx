import type { Metadata } from "next";

import "./globals.css";

import { Analytics } from "@vercel/analytics/react";

import { PixelatedSpinner } from "../components/common/PixelatedSpinner";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | Drumhaus",
    default: "Drumhaus",
  },

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
    title: "Drumhaus",
    description:
      "Drumhaus is the ultimate browser controlled rhythmic groove machine. Explore web based drum sampling with limitless creativity, and share it all with your friends.",
    images: "/opengraph-image.png",
  },

  metadataBase: new URL("https://www.drumha.us/"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#e8e3dd" }}>
        <div id="initial-loader" className="initial-loader">
          <PixelatedSpinner size={64} />
        </div>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
