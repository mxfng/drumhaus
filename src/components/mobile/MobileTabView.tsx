import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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

      {/* Tabs */}
      <div className="border-border flex border-b">
        <button
          onClick={() => setActiveTab("controls")}
          className={cn(
            "border-border flex-1 border-r px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "controls"
              ? "bg-surface text-primary-muted"
              : "bg-surface-muted text-foreground-muted hover:bg-surface",
          )}
        >
          CONTROLS
        </button>
        <button
          onClick={() => setActiveTab("instrument")}
          className={cn(
            "border-border flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "instrument"
              ? "bg-surface text-primary-muted"
              : "bg-surface-muted text-foreground-muted hover:bg-surface",
          )}
        >
          INSTRUMENT
        </button>
      </div>

      {/* Tab Content */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {activeTab === "controls" && (
            <motion.div
              key="controls"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 28,
                mass: 0.5,
              }}
              className="bg-surface absolute inset-0 flex h-full flex-col items-center justify-center overflow-y-auto p-1"
            >
              <div className="flex flex-1 items-center justify-center">
                <SequencerControl />
              </div>
              <Sequencer />
            </motion.div>
          )}
          {activeTab === "instrument" && (
            <motion.div
              key="instrument"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 28,
                mass: 0.5,
              }}
              className="bg-surface-raised absolute inset-0 flex h-full flex-col overflow-y-auto"
            >
              <InstrumentParams
                key={`mobile-instrument-params-${voiceIndex}-${instrumentRuntimesVersion}`}
                index={voiceIndex}
                instrumentIndex={voiceIndex}
                fillHeight
                runtime={instrumentRuntimes[voiceIndex]}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
