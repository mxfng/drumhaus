import { useEffect, useState } from "react";

import { InstrumentParamsControl } from "@/components/instrument/InstrumentParamsControl";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { InstrumentHeader } from "../instrument/InstrumentHeader";

const INSTRUMENT_COLORS = [
  "var(--color-track-blue)",
  "var(--color-track-orange)",
  "var(--color-track-red)",
  "var(--color-track-green)",
  "var(--color-track-blue)",
  "var(--color-track-orange)",
  "var(--color-track-red)",
  "var(--color-track-green)",
];

interface VerticalInstrumentSelectorProps {
  instrumentRuntimes: InstrumentRuntime[];
  instrumentRuntimesVersion: number;
  voiceIndex: number;
}

export const VerticalInstrumentSelector: React.FC<
  VerticalInstrumentSelectorProps
> = ({ instrumentRuntimes, instrumentRuntimesVersion, voiceIndex }) => {
  const instruments = useInstrumentsStore((state) => state.instruments);
  const [isOpen, setIsOpen] = useState(false);

  const instrument = instruments[voiceIndex];

  // Calculate responsive waveform dimensions
  const [waveformWidth, setWaveformWidth] = useState(170);
  const [waveformHeight, setWaveformHeight] = useState(60);

  useEffect(() => {
    const updateWaveformDimensions = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // On mobile (<640px), use 70% of viewport width
      const calculatedWidth = Math.min(viewportWidth * 0.7);
      setWaveformWidth(calculatedWidth);

      // Height is roughly 1/6 of viewport minus header space (about 40-50px for title)
      const calculatedHeight = Math.max(viewportHeight / 6 - 50, 40);
      setWaveformHeight(calculatedHeight);
    };

    updateWaveformDimensions();
    window.addEventListener("resize", updateWaveformDimensions);
    return () => window.removeEventListener("resize", updateWaveformDimensions);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex h-full w-full flex-col items-center justify-center text-xs transition-colors",
          "bg-surface-muted hover:bg-surface",
        )}
        style={{
          borderLeftColor: INSTRUMENT_COLORS[voiceIndex],
          borderLeftWidth: "3px",
        }}
      >
        <span
          className="font-pixel text-base leading-tight"
          style={{ color: INSTRUMENT_COLORS[voiceIndex] }}
        >
          {voiceIndex + 1}
        </span>
        <span className="text-foreground-muted mt-0.5 truncate text-[9px]">
          {instrument.meta.name.slice(0, 3)}
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogTitle className="hidden">{instrument.meta.name}</DialogTitle>
          {/* Instrument Header */}
          <div className="border-border h-36">
            <InstrumentHeader
              key={`mobile-instrument-header-${voiceIndex}-${instrumentRuntimesVersion}`}
              index={voiceIndex}
              color={INSTRUMENT_COLORS[voiceIndex]}
              waveformWidth={waveformWidth}
              waveformHeight={waveformHeight}
              runtime={instrumentRuntimes[voiceIndex]}
            />
          </div>
          <InstrumentParamsControl
            key={`vertical-instrument-params-${voiceIndex}-${instrumentRuntimesVersion}`}
            index={voiceIndex}
            instrumentIndex={voiceIndex}
            mobile
            runtime={instrumentRuntimes[voiceIndex]}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
