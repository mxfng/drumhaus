import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { MasterCompressor } from "@/components/controls/master/MasterCompressor";
import { MasterFX } from "@/components/controls/master/MasterFX";
import { MasterVolume } from "@/components/controls/master/MasterVolume";
import { SequencerControl } from "@/components/controls/SequencerControl";
import { TransportControl } from "@/components/controls/TransportControl";
import { Sequencer } from "@/components/Sequencer";
import { usePatternStore } from "@/stores/usePatternStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { InstrumentHeader } from "../instrument/InstrumentHeader";
import { InstrumentParamsControl } from "../instrument/InstrumentParamsControl";

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

export type TabType = "instrument" | "controls" | "transport" | "bus";

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

  // Smooth fade + scale animation config
  const transitionConfig = {
    duration: 0.15,
    ease: [0.22, 1, 0.36, 1] as const, // Custom easing for smooth feel
  };

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-hidden">
      {/* Instrument Header */}
      <div className="border-border h-1/6 border-b">
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
      <div className="relative flex-1 overflow-hidden shadow-[inset_0_8px_8px_-6px_var(--color-shadow-30),inset_0_-8px_8px_-6px_var(--color-shadow-30)]">
        <AnimatePresence initial={false} mode="wait">
          {activeTab === "controls" && (
            <motion.div
              key="controls"
              data-scrollable
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={transitionConfig}
              className="absolute inset-0 flex h-full flex-col items-center justify-center gap-8 overflow-y-auto p-1"
            >
              <div className="flex w-full items-center justify-center">
                <SequencerControl />
              </div>
              <Sequencer />
            </motion.div>
          )}
          {activeTab === "instrument" && (
            <motion.div
              key="instrument"
              data-scrollable
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={transitionConfig}
              className="bg-surface-raised absolute inset-0 flex h-full flex-col overflow-y-auto"
            >
              <InstrumentParamsControl
                key={`mobile-instrument-params-${voiceIndex}-${instrumentRuntimesVersion}`}
                index={voiceIndex}
                instrumentIndex={voiceIndex}
                mobile
                runtime={instrumentRuntimes[voiceIndex]}
              />
            </motion.div>
          )}
          {activeTab === "transport" && (
            <motion.div
              key="transport"
              data-scrollable
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={transitionConfig}
              className="absolute inset-0 flex h-full flex-col items-center justify-center overflow-y-auto p-8"
            >
              <TransportControl />
            </motion.div>
          )}
          {activeTab === "bus" && (
            <motion.div
              key="bus"
              data-scrollable
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={transitionConfig}
              className="absolute inset-0 flex h-full flex-col items-center justify-center gap-6 overflow-y-auto p-4"
            >
              <MasterVolume />
              <MasterCompressor />
              <MasterFX />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
