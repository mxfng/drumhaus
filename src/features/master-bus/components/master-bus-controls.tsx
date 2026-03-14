import { MasterCompressor } from "@/features/master-bus/components/master-compressor";
import { MasterFX } from "@/features/master-bus/components/master-fx";
import { MasterVolume } from "@/features/master-bus/components/master-volume";
import { HardwareModule } from "@/shared/components/hardware-module";

export function MasterBusControls() {
  return (
    <>
      <HardwareModule className="col-span-2 flex h-full items-center justify-center">
        <div className="col-span-2 grid grid-cols-4 gap-2">
          <MasterFX />
          <MasterCompressor />
        </div>
      </HardwareModule>

      <div className="flex items-center justify-center px-4">
        <MasterVolume />
      </div>
    </>
  );
}
