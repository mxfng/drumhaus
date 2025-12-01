import { Pause, Play } from "lucide-react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { MasterCompressor } from "@/features/master-bus/components/MasterCompressor";
import { MasterFX } from "@/features/master-bus/components/MasterFX";
import { MasterVolume } from "@/features/master-bus/components/MasterVolume";
import { SequencerControl } from "@/features/sequencer/components/SequencerControl";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { Button, Tooltip } from "@/shared/ui";

export const ControlsPanel = () => {
  const { instrumentRuntimes } = useDrumhaus();
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  return (
    <div className="grid w-full grid-cols-8 flex-row items-center p-6">
      {/* Play/Pause Button */}
      <div className="flex items-center justify-center">
        <Tooltip content={isPlaying ? "Pause [Space]" : "Play [Space]"}>
          <Button
            variant="hardware"
            size="lg"
            className="neu-medium-raised h-[140px] w-[140px] rounded-lg shadow-[var(--shadow-neu-md),0_0_2px_3px_var(--color-shadow-30)]"
            onClick={() => togglePlay(instrumentRuntimes.current)}
            onKeyDown={(ev) => ev.preventDefault()}
          >
            {isPlaying ? (
              <Pause fill="currentColor" size={50} strokeWidth={1} />
            ) : (
              <Play fill="currentColor" size={50} strokeWidth={1} />
            )}
          </Button>
        </Tooltip>
      </div>

      {/* Sequencer & Transport Controls */}
      <div className="col-span-2 flex flex-row">
        <SequencerControl />
        {/* <TransportControl /> */}
      </div>

      {/* Preset Control */}
      <div></div>
      {/* <div className="col-span-2 flex h-full flex-row py-3">
        <PresetControl />
      </div> */}

      <div></div>

      {/* Master Controls */}
      <MasterCompressor />
      <MasterFX />
      <MasterVolume />
    </div>
  );
};
