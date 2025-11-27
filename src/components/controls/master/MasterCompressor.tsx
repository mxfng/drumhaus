import ParamKnob from "@/components/common/Knob";
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
    <div className="flex w-full items-center justify-center">
      <div className="grid w-full grid-cols-2 place-items-center">
        {/* Threshold and Ratio */}

        <ParamKnob
          value={threshold}
          onValueChange={setThreshold}
          label="THRESHOLD"
          mapping={compThresholdMapping}
        />
        {/* Gain Reduction Meter and Mix */}
        <GainReductionMeter />
        <ParamKnob
          value={ratio}
          onValueChange={setRatio}
          label="RATIO"
          mapping={compRatioMapping}
          outerTickCount={8}
        />

        <ParamKnob
          value={mix}
          onValueChange={setMix}
          label="MIX"
          mapping={compMixMapping}
        />
      </div>
    </div>
  );
};
