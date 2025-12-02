import { AudioWaveform, Pause, Play, PlusIcon, Speaker } from "lucide-react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { MasterCompressor } from "@/features/master-bus/components/MasterCompressor";
import { MasterFX } from "@/features/master-bus/components/MasterFX";
import { MasterVolume } from "@/features/master-bus/components/MasterVolume";
import { SequencerControl } from "@/features/sequencer/components/SequencerControl";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import {
  HardwareModule,
  HardwareModuleLabel,
  HardwareModuleSpacer,
} from "@/shared/components/HardwareModule";
import { ParamKnob } from "@/shared/knob/Knob";
import { masterVolumeMapping } from "@/shared/knob/lib/mapping";
import { Button, Label, Tooltip } from "@/shared/ui";

export const ControlsPanel = () => {
  const { instrumentRuntimes } = useDrumhaus();
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  return (
    <div className="grid w-full grid-cols-8 flex-row items-center gap-y-2 px-6 py-2">
      {/* Module Labels */}
      <div />
      <HardwareModuleLabel className="col-span-2">pattern</HardwareModuleLabel>
      <HardwareModuleLabel>groove</HardwareModuleLabel>
      <HardwareModuleLabel>stuff</HardwareModuleLabel>
      <div className="col-span-2 mx-auto flex w-fit flex-row items-center gap-1">
        <HardwareModuleLabel className="w-fit">FX</HardwareModuleLabel>
        <PlusIcon size={12} />
        <HardwareModuleLabel variant="outline" className="w-fit">
          compressor <AudioWaveform size={12} />
        </HardwareModuleLabel>
      </div>
      <div />

      {/* Play/Pause Button */}
      <div className="flex items-center justify-center">
        <Tooltip content={isPlaying ? "Pause [Space]" : "Play [Space]"}>
          <Button
            variant="hardware"
            size="lg"
            className="aspect-square h-full w-auto rounded-xl p-3"
            onClick={() => togglePlay(instrumentRuntimes.current)}
            onKeyDown={(ev) => ev.preventDefault()}
          >
            <div className="neu-medium-raised flex h-full w-full items-center justify-center rounded-full shadow-[var(--shadow-neu-md),0_0_2px_3px_var(--color-shadow-30)]">
              {isPlaying ? (
                <Pause fill="currentColor" size={50} strokeWidth={1} />
              ) : (
                <Play fill="currentColor" size={50} strokeWidth={1} />
              )}
            </div>
          </Button>
        </Tooltip>
      </div>

      {/* Pattern Controls */}
      <div className="col-span-2 flex flex-row px-4">
        <SequencerControl />
      </div>

      {/* Groove Controls  */}
      <div className="mx-auto w-5/6 px-4">
        <HardwareModule>
          <div className="grid grid-cols-2 gap-x-2 gap-y-4">
            <Button
              variant="hardware"
              size="sm"
              className="relative overflow-hidden"
            >
              <span>nudge</span>
            </Button>
            <Button
              variant="hardware"
              size="sm"
              className="relative overflow-hidden"
            >
              <span>nudge</span>
            </Button>
            <div className="col-span-2 mx-auto w-1/2">
              <Button
                variant="hardware"
                size="sm"
                className="relative overflow-hidden"
              >
                <span>accent</span>
              </Button>
            </div>
          </div>
          <HardwareModuleSpacer />
        </HardwareModule>
      </div>

      <div className="mx-auto flex w-5/6 flex-col items-center justify-center gap-4 px-4">
        <ParamKnob
          value={0}
          onValueChange={() => {}}
          label=""
          mapping={masterVolumeMapping}
        />
        <div className="grid grid-cols-3 place-items-center gap-2">
          <Button
            variant="hardwareIcon"
            size="icon"
            className="relative w-6 overflow-hidden"
          >
            <Speaker size={12} />
          </Button>

          <Button variant="hardwareIcon" size="icon">
            <Speaker size={12} />
          </Button>

          <Button variant="hardwareIcon" size="icon">
            <Speaker size={12} />
          </Button>
          <Label className="text-[10px]">tempo</Label>
          <Label className="text-[10px]">swing</Label>
          <Label className="text-[10px]">tap</Label>
        </div>
      </div>

      {/* Master Controls */}
      <HardwareModule className="col-span-2">
        <div className="col-span-2 grid grid-cols-4 gap-2">
          <MasterFX />
        </div>

        <HardwareModule className="mx-auto grid w-3/4 grid-cols-3">
          <MasterCompressor />
        </HardwareModule>
      </HardwareModule>

      <div className="flex items-center justify-center px-4">
        <MasterVolume />
      </div>
    </div>
  );
};
