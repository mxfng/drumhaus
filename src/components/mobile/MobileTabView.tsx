import { useEffect, useState } from "react";

import { SequencerControl } from "@/components/controls/SequencerControl";
import { Sequencer } from "@/components/Sequencer";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/stores/usePatternStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { InstrumentHeader } from "../instrument/InstrumentHeader";
import { InstrumentParams } from "../instrument/InstrumentParams";

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

export type TabType = "instrument" | "controls";

interface MobileTabViewProps {
  instrumentRuntimes: InstrumentRuntime[];
  instrumentRuntimesVersion: number;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileTabView: React.FC<MobileTabViewProps> = ({
  instrumentRuntimes,
  instrumentRuntimesVersion,
  activeTab,
  setActiveTab,
}) => {
  const voiceIndex = usePatternStore((state) => state.voiceIndex);

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
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-hidden">
      {/* Tabs */}
      <div className="border-border flex border-b">
        <button
          onClick={() => setActiveTab("instrument")}
          className={cn(
            "border-border flex-1 border-r px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "instrument"
              ? "bg-surface text-primary-muted"
              : "bg-surface-muted text-foreground-muted hover:bg-surface",
          )}
        >
          INSTRUMENT
        </button>
        <button
          onClick={() => setActiveTab("controls")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "controls"
              ? "bg-surface text-primary-muted"
              : "bg-surface-muted text-foreground-muted hover:bg-surface",
          )}
        >
          CONTROLS
        </button>
      </div>

      {/* Instrument Header */}
      <div className="bg-surface-raised border-border h-1/6 border-b">
        <InstrumentHeader
          key={`mobile-instrument-header-${voiceIndex}-${instrumentRuntimesVersion}`}
          index={voiceIndex}
          color={INSTRUMENT_COLORS[voiceIndex]}
          waveformWidth={waveformWidth}
          waveformHeight={waveformHeight}
          runtime={instrumentRuntimes[voiceIndex]}
        />
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        {activeTab === "instrument" && (
          <div className="bg-surface-raised flex h-full flex-col">
            <InstrumentParams
              key={`mobile-instrument-params-${voiceIndex}-${instrumentRuntimesVersion}`}
              index={voiceIndex}
              instrumentIndex={voiceIndex}
              fillHeight
              runtime={instrumentRuntimes[voiceIndex]}
            />
          </div>
        )}

        {activeTab === "controls" && (
          <div className="bg-surface flex h-full flex-col items-center justify-center p-1">
            <div className="flex flex-1 items-center justify-center">
              <SequencerControl />
            </div>
            <Sequencer />
          </div>
        )}
      </div>
    </div>
  );
};
