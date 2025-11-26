import { useEffect, useState } from "react";

import { SequencerControl } from "@/components/controls/SequencerControl";
import { InstrumentControl } from "@/components/instrument/InstrumentControl";
import { Sequencer } from "@/components/Sequencer";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/stores/usePatternStore";
import type { InstrumentRuntime } from "@/types/instrument";

const INSTRUMENT_COLORS = [
  "#213062",
  "#e9902f",
  "#d72529",
  "#27991a",
  "#213062",
  "#e9902f",
  "#d72529",
  "#27991a",
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

  // Calculate responsive waveform width
  const [waveformWidth, setWaveformWidth] = useState(170);

  useEffect(() => {
    const updateWaveformWidth = () => {
      const viewportWidth = window.innerWidth;
      // On mobile (<640px), use 80% of viewport width, capped at 350px
      // On desktop, use default 170px
      if (viewportWidth < 640) {
        const calculatedWidth = Math.min(viewportWidth * 0.8, 350);
        setWaveformWidth(calculatedWidth);
      } else {
        setWaveformWidth(170);
      }
    };

    updateWaveformWidth();
    window.addEventListener("resize", updateWaveformWidth);
    return () => window.removeEventListener("resize", updateWaveformWidth);
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
              ? "bg-surface text-foreground-emphasis"
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
              ? "bg-surface text-foreground-emphasis"
              : "bg-surface-muted text-foreground-muted hover:bg-surface",
          )}
        >
          CONTROLS
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        {activeTab === "instrument" && (
          <div className="bg-surface-raised h-full">
            <InstrumentControl
              key={`mobile-instrument-${voiceIndex}-${instrumentRuntimesVersion}`}
              runtime={instrumentRuntimes[voiceIndex]}
              index={voiceIndex}
              instrumentIndex={voiceIndex}
              color={INSTRUMENT_COLORS[voiceIndex]}
              bg="#E8E3DD"
              waveformWidth={waveformWidth}
              fillHeight={true}
            />
          </div>
        )}

        {activeTab === "controls" && (
          <div className="bg-surface flex h-full flex-col items-center justify-center gap-4 p-4">
            <div className="flex aspect-auto flex-1 scale-110 items-center justify-center">
              <SequencerControl />
            </div>
            <Sequencer />
          </div>
        )}
      </div>
    </div>
  );
};
