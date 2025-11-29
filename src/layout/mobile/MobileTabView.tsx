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

  const renderPanel = (
    key: string,
    className: string,
    children: React.ReactNode,
  ) => (
    <motion.div
      key={key}
      data-scrollable
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={transitionConfig}
      className={className}
    >
      {children}
    </motion.div>
  );

  const renderBusSubPanel = (key: string, child: React.ReactNode) =>
    renderPanel(key, "flex h-full flex-col items-center justify-center", child);

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-hidden">
      {/* Tab Content */}
      <div className="relative flex-1 overflow-hidden shadow-[inset_0_8px_8px_-6px_var(--color-shadow-30),inset_0_-8px_8px_-6px_var(--color-shadow-30)]">
        <AnimatePresence initial={false} mode="wait">
          {activeTab === "controls" &&
            renderPanel(
              "controls",
              "absolute inset-0 flex h-full flex-col",
              <div className="flex-1 overflow-hidden">
                <MobileSequencer />
              </div>,
            )}

          {activeTab === "instrument" &&
            renderPanel(
              "instrument",
              "bg-surface-raised absolute inset-0 flex h-full flex-col overflow-y-auto",
              <MobileInstrumentGrid mode={instrumentMode} />,
            )}

          {activeTab === "bus" &&
            renderPanel(
              "bus",
              "absolute inset-0 flex h-full flex-col overflow-y-auto p-4",
              <AnimatePresence initial={false} mode="wait">
                {busSubTab === "comp" &&
                  renderBusSubPanel("comp", <MasterCompressor />)}
                {busSubTab === "fx" && renderBusSubPanel("fx", <MasterFX />)}
                {busSubTab === "level" &&
                  renderBusSubPanel("level", <MasterVolume />)}
                {busSubTab === "tempo" &&
                  renderBusSubPanel("tempo", <TransportControl />)}
              </AnimatePresence>,
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};
