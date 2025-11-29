import { AnimatePresence, motion } from "framer-motion";

import { MobileInstrumentGrid } from "@/features/instrument/components/MobileInstrumentGrid";
import { MasterCompressor } from "@/features/master-bus/components/MasterCompressor";
import { MasterFX } from "@/features/master-bus/components/MasterFX";
import { MasterVolume } from "@/features/master-bus/components/MasterVolume";
import { MobileSequencer } from "@/features/sequencer/components/MobileSequencer";
import { TransportControl } from "@/features/transport/components/TransportControl";
import { useMobileNavStore } from "@/shared/store/useMobileNavStore";

export type TabType = "instrument" | "controls" | "bus";

export const MobileTabView: React.FC = () => {
  const activeTab = useMobileNavStore((state) => state.activeTab);
  const instrumentMode = useMobileNavStore((state) => state.instrumentMode);
  const busSubTab = useMobileNavStore((state) => state.busSubTab);
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
                <MobileSequencer />
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
              <MobileInstrumentGrid mode={instrumentMode} />
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
