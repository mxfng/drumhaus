import { Label } from "@/components/ui";
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
    <div className="relative flex items-center">
      <Label className="text-foreground-muted absolute -left-10 w-[85px] -rotate-90">
        COMPRESSOR
      </Label>
      <div className="flex flex-col gap-2 pl-4">
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
  );
};
