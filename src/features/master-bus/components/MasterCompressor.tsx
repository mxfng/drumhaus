import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
} from "@/shared/knob/lib/mapping";

export const MasterCompressor: React.FC = () => {
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);
  const mix = useMasterChainStore((state) => state.compMix);

  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
  const setMix = useMasterChainStore((state) => state.setCompMix);

  return (
    <div className="grid aspect-square w-full grid-cols-2 place-items-center gap-2">
      {/* Threshold and Ratio */}
      <ParamKnob
        value={threshold}
        onValueChange={setThreshold}
        label="threshold"
        mapping={compThresholdMapping}
      />
      <ParamKnob
        value={ratio}
        onValueChange={setRatio}
        label="ratio"
        mapping={compRatioMapping}
        outerTickCount={8}
      />

      <ParamKnob
        value={mix}
        onValueChange={setMix}
        label="mix"
        mapping={compMixMapping}
      />
    </div>
  );
};
