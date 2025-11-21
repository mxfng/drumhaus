import { MasterCompressor } from "./master/MasterCompressor";
import { MasterFX } from "./master/MasterFX";
import { MasterVolume } from "./master/MasterVolume";

export const MasterControl: React.FC = () => {
  return (
    <>
      <div className="col-span-1 w-[120px] pl-8 pr-4">
        <MasterFX />
      </div>

      <div className="col-span-1 px-4">
        <MasterCompressor />
      </div>

      <div className="col-span-1 w-[140px]">
        <MasterVolume />
      </div>
    </>
  );
};
