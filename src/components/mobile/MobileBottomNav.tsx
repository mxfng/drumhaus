import { useState } from "react";
import { ArrowLeftRight, ListMusic, Pause, Play, Sliders } from "lucide-react";

import { MasterCompressor } from "@/components/controls/master/MasterCompressor";
import { MasterFX } from "@/components/controls/master/MasterFX";
import { MasterVolume } from "@/components/controls/master/MasterVolume";
import { TransportControl } from "@/components/controls/TransportControl";
import { Button, Dialog, DialogContent } from "@/components/ui";
import { DialogCloseButton } from "@/components/ui/Dialog";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { TabType } from "./MobileTabView";

interface MobileBottomNavProps {
  instrumentRuntimes: InstrumentRuntime[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenPresetMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  instrumentRuntimes,
  activeTab,
  setActiveTab,
  onOpenPresetMenu,
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
      <div className="border-border bg-surface grid grid-cols-5 gap-2 border-t p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Tempo */}
        <button
          onClick={() => setTransportDialogOpen(true)}
          className="hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        >
          <span className="font-pixel flex h-5 items-center justify-center text-lg">
            {bpm}
          </span>
          <span className="text-foreground-muted mt-1 text-xs">TEMPO</span>
        </button>

        {/* Bus Button */}
        <button
          onClick={() => setBusDialogOpen(true)}
          className="hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        >
          <Sliders size={20} />
          <span className="text-foreground-muted mt-1 text-xs">BUS</span>
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

        {/* Preset Menu Button */}
        <button
          onClick={onOpenPresetMenu}
          className="hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        >
          <ListMusic size={20} />
          <span className="text-foreground-muted mt-1 text-xs">PRESET</span>
        </button>

        {/* Swap Tab Button */}
        <button
          onClick={handleSwapTab}
          className="hover:bg-surface-muted active:bg-surface-raised flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        >
          <ArrowLeftRight size={20} />
          <span className="text-foreground-muted mt-1 text-xs">TAB</span>
        </button>
      </div>

      {/* Transport Dialog */}
      <Dialog open={transportDialogOpen} onOpenChange={setTransportDialogOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-md">
          <DialogCloseButton />
          <div className="flex w-full flex-col items-center gap-4 p-8">
            <TransportControl />
          </div>
        </DialogContent>
      </Dialog>

      {/* Bus Dialog */}
      <Dialog open={busDialogOpen} onOpenChange={setBusDialogOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-md">
          <DialogCloseButton />
          <div className="flex flex-col items-center gap-6">
            <MasterVolume />
            <div className="grid grid-cols-2 gap-4">
              <MasterCompressor />
              <MasterFX />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
