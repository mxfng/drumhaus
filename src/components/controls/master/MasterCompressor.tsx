import { Label } from "@/components/ui";
import {
  MASTER_COMP_DEFAULT_MIX,
  MASTER_COMP_DEFAULT_THRESHOLD,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
} from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";
import { GainReductionMeter } from "./GainReductionMeter";

export const MasterCompressor: React.FC = () => {
  // Get state from Master FX Store
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);
  const mix = useMasterChainStore((state) => state.compMix);

  // Get actions from store
  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
  const setMix = useMasterChainStore((state) => state.setCompMix);

  return (
    <div className="relative -mr-2 flex items-center">
      <Label className="text-foreground-muted absolute -left-8 w-[65px] -rotate-90">
        BUS COMP
      </Label>
      <div className="flex pl-4">
        {/* Column 1: Threshold and Ratio */}
        <div className="flex flex-col gap-2">
          <Knob
            value={threshold}
            onChange={setThreshold}
            label="THRESHOLD"
            units="dB"
            range={MASTER_COMP_THRESHOLD_RANGE}
            defaultValue={MASTER_COMP_DEFAULT_THRESHOLD}
            size="sm"
          />
          <Knob
            value={ratio}
            onChange={setRatio}
            label="RATIO"
            units=": 1"
            range={MASTER_COMP_RATIO_RANGE}
            defaultValue={43}
            size="sm"
          />
        </div>
        {/* Column 2: Gain Reduction Meter and Mix */}
        <div className="flex -translate-x-2 flex-col gap-2">
          <div className="flex-1 translate-y-3">
            <GainReductionMeter />
          </div>
          <Knob
            value={mix}
            onChange={setMix}
            label="MIX"
            units="%"
            range={MASTER_COMP_MIX_RANGE}
            defaultValue={MASTER_COMP_DEFAULT_MIX}
            size="xs"
          />
        </div>
      </div>
    </div>
  );
};
