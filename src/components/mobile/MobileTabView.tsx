import { AnimatePresence, motion } from "framer-motion";

import { MasterCompressor } from "@/components/controls/master/MasterCompressor";
import { MasterFX } from "@/components/controls/master/MasterFX";
import { MasterVolume } from "@/components/controls/master/MasterVolume";
import { TransportControl } from "@/components/controls/TransportControl";
import type { InstrumentRuntime } from "@/types/instrument";
import type { BusSubTab } from "./contextmenu/MobileBusContextMenu";
import type { InstrumentMode } from "./contextmenu/MobileInstrumentContextMenu";
import { MobileInstrumentGrid } from "./instrument/MobileInstrumentGrid";
import { MobileSequencer } from "./sequencer/MobileSequencer";

export type TabType = "instrument" | "controls" | "bus";

interface MobileTabViewProps {
  instrumentRuntimes: InstrumentRuntime[];
  instrumentRuntimesVersion: number;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  instrumentMode: InstrumentMode;
  busSubTab: BusSubTab;
}

export const MobileTabView: React.FC<MobileTabViewProps> = ({
  instrumentRuntimes,
  instrumentRuntimesVersion,
  activeTab,
  instrumentMode,
  busSubTab,
}) => {
  // Smooth fade + scale animation config
  const transitionConfig = {
    duration: 0.15,
    ease: [0.22, 1, 0.36, 1] as const, // Custom easing for smooth feel
  };

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-hidden">
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
              className="absolute inset-0 flex h-full flex-col"
            >
              <div className="flex-1 overflow-hidden">
                <MobileSequencer
                  instrumentRuntimes={instrumentRuntimes}
                  instrumentRuntimesVersion={instrumentRuntimesVersion}
                />
              </div>
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
              <MobileInstrumentGrid
                instrumentRuntimes={instrumentRuntimes}
                instrumentRuntimesVersion={instrumentRuntimesVersion}
                mode={instrumentMode}
              />
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
              className="absolute inset-0 flex h-full flex-col overflow-y-auto p-4"
            >
              <AnimatePresence initial={false} mode="wait">
                {busSubTab === "comp" && (
                  <motion.div
                    key="comp"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={transitionConfig}
                    className="flex h-full flex-col items-center justify-center"
                  >
                    <MasterCompressor />
                  </motion.div>
                )}
                {busSubTab === "fx" && (
                  <motion.div
                    key="fx"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={transitionConfig}
                    className="flex h-full flex-col items-center justify-center"
                  >
                    <MasterFX />
                  </motion.div>
                )}
                {busSubTab === "level" && (
                  <motion.div
                    key="level"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={transitionConfig}
                    className="flex h-full flex-col items-center justify-center"
                  >
                    <MasterVolume />
                  </motion.div>
                )}
                {busSubTab === "tempo" && (
                  <motion.div
                    key="tempo"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={transitionConfig}
                    className="flex h-full flex-col items-center justify-center"
                  >
                    <TransportControl />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
