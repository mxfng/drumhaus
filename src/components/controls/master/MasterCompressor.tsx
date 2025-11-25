import ParamKnob from "@/components/common/Knob";
import { Label } from "@/components/ui";
import {
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
} from "@/lib/knob/mapping";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { GainReductionMeter } from "./GainReductionMeter";

export const MasterCompressor: React.FC = () => {
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);
  const mix = useMasterChainStore((state) => state.compMix);

  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
  const setMix = useMasterChainStore((state) => state.setCompMix);

  return (
    <div className="relative -mr-2 flex items-center">
      <Label className="text-foreground-muted absolute -left-8 w-[65px] -rotate-90">
        BUS COMP
      </Label>
      <div className="flex pl-4">
        {/* Threshold and Ratio */}
        <div className="flex flex-col gap-2">
          <ParamKnob
            value={threshold}
            onValueChange={setThreshold}
            label="THRESHOLD"
            mapping={compThresholdMapping}
          />
          <ParamKnob
            value={ratio}
            onValueChange={setRatio}
            label="RATIO"
            mapping={compRatioMapping}
            outerTickCount={8}
          />
        </div>

        {/* Gain Reduction Meter and Mix */}
        <div className="flex -translate-x-2 flex-col gap-2">
          <div className="flex-1 translate-y-3">
            <GainReductionMeter />
          </div>
          <ParamKnob
            value={mix}
            onValueChange={setMix}
            label="MIX"
            mapping={compMixMapping}
          />
        </div>
      </div>
    </div>
  );
};
