import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import ParamKnob from "@/shared/lib/knob/Knob";
import {
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
} from "@/shared/lib/knob/mapping";
import { GainReductionMeter } from "./GainReductionMeter";

export const MasterCompressor: React.FC = () => {
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);
  const mix = useMasterChainStore((state) => state.compMix);

  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
  const setMix = useMasterChainStore((state) => state.setCompMix);

  return (
    <div className="grid aspect-square w-full grid-cols-2 place-items-center">
      {/* Threshold and Ratio */}
      <ParamKnob
        value={threshold}
        onValueChange={setThreshold}
        label="THRESHOLD"
        mapping={compThresholdMapping}
      />
      {/* Gain Reduction Meter and Mix */}
      <div className="flex h-full items-center justify-center py-8 sm:py-1">
        <GainReductionMeter />
      </div>
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
  );
};
