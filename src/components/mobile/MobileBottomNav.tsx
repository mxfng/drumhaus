import { CircleDot, Grid3x3, Pause, Play, Sliders } from "lucide-react";

import { Button } from "@/components/ui";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { TabType } from "./MobileTabView";

interface MobileBottomNavProps {
  instrumentRuntimes: InstrumentRuntime[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  instrumentRuntimes,
  activeTab,
  setActiveTab,
}) => {
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);
  const bpm = useTransportStore((state) => state.bpm);

  return (
    <>
      <div className="border-border bg-surface grid grid-cols-5 gap-2 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Sequencer Button */}
        <button
          onClick={() => setActiveTab("controls")}
          className={`hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors ${activeTab === "controls" ? "bg-surface-muted text-primary-muted" : ""}`}
        >
          <Grid3x3
            size={20}
            className={activeTab === "controls" ? "text-primary-muted" : ""}
          />
          <span
            className={`mt-1 text-xs ${activeTab === "controls" ? "text-primary-muted" : "text-foreground-muted"}`}
          >
            SEQ
          </span>
        </button>

        {/* Instrument Button */}
        <button
          onClick={() => setActiveTab("instrument")}
          className={`hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors ${activeTab === "instrument" ? "bg-surface-muted text-primary-muted" : ""}`}
        >
          <CircleDot
            size={20}
            className={activeTab === "instrument" ? "text-primary-muted" : ""}
          />
          <span
            className={`mt-1 text-xs ${activeTab === "instrument" ? "text-primary-muted" : "text-foreground-muted"}`}
          >
            INST
          </span>
        </button>

        {/* Play Button (centered) */}
        <Button
          variant="hardware"
          className="neu-medium-raised h-full rounded-lg shadow-lg"
          onClick={() => togglePlay(instrumentRuntimes)}
        >
          {isPlaying ? (
            <Pause fill="currentColor" size={32} strokeWidth={1} />
          ) : (
            <Play fill="currentColor" size={32} strokeWidth={1} />
          )}
        </Button>

        {/* Bus Button */}
        <button
          onClick={() => setActiveTab("bus")}
          className={`hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors ${activeTab === "bus" ? "bg-surface-muted text-primary-muted" : ""}`}
        >
          <Sliders
            size={20}
            className={activeTab === "bus" ? "text-primary-muted" : ""}
          />
          <span
            className={`mt-1 text-xs ${activeTab === "bus" ? "text-primary-muted" : "text-foreground-muted"}`}
          >
            BUS
          </span>
        </button>

        {/* Tempo */}
        <button
          onClick={() => setActiveTab("transport")}
          className={`hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors ${activeTab === "transport" ? "bg-surface-muted text-primary-muted" : ""}`}
        >
          <span
            className={`font-pixel flex h-5 items-center justify-center text-lg ${activeTab === "transport" ? "text-primary-muted" : ""}`}
          >
            {bpm}
          </span>
          <span
            className={`mt-1 text-xs ${activeTab === "transport" ? "text-primary-muted" : "text-foreground-muted"}`}
          >
            TEMPO
          </span>
        </button>
      </div>
    </>
  );
};
