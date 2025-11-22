import {
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
} from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterCompressor: React.FC = () => {
  // Get state from Master FX Store
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);

  // Get actions from store
  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);

  return (
    <div className="h-full w-[130px]">
      <div className="grid grid-cols-2">
        <div className="relative">
          <span className="font-pixel text-text absolute bottom-[70px] -left-0.5 -rotate-90 text-xs opacity-50">
            COMPRESSOR
          </span>
        </div>
        <div>
          <Knob
            value={threshold}
            onChange={setThreshold}
            label="THRESHOLD"
            units="dB"
            range={MASTER_COMP_THRESHOLD_RANGE}
            defaultValue={100}
          />
          <Knob
            value={ratio}
            onChange={setRatio}
            label="RATIO"
            units=": 1"
            range={MASTER_COMP_RATIO_RANGE}
            defaultValue={43}
          />
        </div>
      </div>
    </div>
  );
};
