import { AudioWaveform, PlusIcon } from "lucide-react";

import { GrooveControls } from "@/features/groove/components/GrooveControls";
import { MasterBusControls } from "@/features/master-bus/components/MasterBusControls";
import { SequencerControl } from "@/features/sequencer/components/SequencerControl";
import { PlayPauseButton } from "@/features/transport/components/PlayPauseButton";
import { TempoControls } from "@/features/transport/components/TempoControls";
import { HardwareModuleLabel } from "@/shared/components/HardwareModule";

export const ControlsPanel = () => {
  return (
    <div className="grid w-full grid-cols-8 flex-row items-center gap-y-1 px-6 py-4">
      {/* Module Labels */}
      <div />
      <HardwareModuleLabel>tempo</HardwareModuleLabel>
      <HardwareModuleLabel className="col-span-2">pattern</HardwareModuleLabel>
      <HardwareModuleLabel>groove</HardwareModuleLabel>

      <div className="col-span-2 mx-auto flex w-fit flex-row items-center gap-1">
        <HardwareModuleLabel className="w-fit">FX</HardwareModuleLabel>
        <PlusIcon size={12} />
        <HardwareModuleLabel variant="outline" className="w-fit">
          compressor <AudioWaveform size={12} />
        </HardwareModuleLabel>
      </div>
      <div />

      {/* Play/Pause Button */}
      <PlayPauseButton />

      {/* Tempo Controls */}
      <TempoControls />

      {/* Pattern Controls */}
      <div className="col-span-2 flex h-full flex-row items-center justify-center px-4">
        <SequencerControl />
      </div>

      {/* Groove Controls  */}
      <div className="px-4">
        <GrooveControls />
      </div>

      {/* Master Controls */}
      <MasterBusControls />
    </div>
  );
};
