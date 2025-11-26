import { useState } from "react";
import { ArrowLeftRight, Pause, Play, Sliders } from "lucide-react";

import { MasterCompressor } from "@/components/controls/master/MasterCompressor";
import { MasterFX } from "@/components/controls/master/MasterFX";
import { MasterVolume } from "@/components/controls/master/MasterVolume";
import { TransportControl } from "@/components/controls/TransportControl";
import { Button, Dialog, DialogContent } from "@/components/ui";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { TabType } from "./MobileTabView";

interface MobilePlayButtonProps {
  instrumentRuntimes: InstrumentRuntime[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobilePlayButton: React.FC<MobilePlayButtonProps> = ({
  instrumentRuntimes,
  activeTab,
  setActiveTab,
}) => {
  const [transportDialogOpen, setTransportDialogOpen] = useState(false);
  const [busDialogOpen, setBusDialogOpen] = useState(false);
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);
  const bpm = useTransportStore((state) => state.bpm);

  const handleSwapTab = () => {
    setActiveTab(activeTab === "instrument" ? "controls" : "instrument");
  };

  return (
    <>
      <div className="border-border bg-surface grid grid-cols-5 gap-2 border-t p-3">
        {/* Tempo */}
        <button
          onClick={() => setTransportDialogOpen(true)}
          className="hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        >
          <span className="text-foreground-muted text-xs">TEMPO</span>
          <span className="font-pixel text-foreground-emphasis text-lg">
            {bpm}
          </span>
        </button>

        {/* Empty column for centering */}
        <div />

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
          onClick={() => setBusDialogOpen(true)}
          className="hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        >
          <Sliders size={20} className="text-foreground-emphasis" />
          <span className="text-foreground-muted mt-1 text-xs">BUS</span>
        </button>

        {/* Swap Tab Button */}
        <button
          onClick={handleSwapTab}
          className="hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        >
          <ArrowLeftRight size={20} className="text-foreground-emphasis" />
          <span className="text-foreground-muted mt-1 text-xs">SWAP</span>
        </button>
      </div>

      {/* Transport Dialog */}
      <Dialog open={transportDialogOpen} onOpenChange={setTransportDialogOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-md">
          <div className="flex flex-col items-center gap-4 p-4">
            <h2 className="font-pixel text-foreground-emphasis text-lg">
              Transport Settings
            </h2>
            <TransportControl />
          </div>
        </DialogContent>
      </Dialog>

      {/* Bus Dialog */}
      <Dialog open={busDialogOpen} onOpenChange={setBusDialogOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-md">
          <div className="flex flex-col items-center gap-6 p-4">
            <h2 className="font-pixel text-foreground-emphasis text-lg">
              Master Bus
            </h2>
            <MasterVolume />
            <div className="flex gap-8">
              <MasterCompressor />
              <MasterFX />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
