import { MasterCompressor } from "@/features/master-bus/components/MasterCompressor";
import { MasterFX } from "@/features/master-bus/components/MasterFX";
import { MasterVolume } from "@/features/master-bus/components/MasterVolume";
import { HardwareModule } from "@/shared/components/HardwareModule";

export const MasterBusControls: React.FC = () => {
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
};
