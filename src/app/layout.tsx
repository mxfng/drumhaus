import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Drumhaus",
  description: "A web-based drum sequencer and synthesizer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: "silver" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
