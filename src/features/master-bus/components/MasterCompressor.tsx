import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
} from "@/shared/knob/lib/mapping";

/*
TODO: Add remaining features

There is an awkward 1st space since the compressor is only 3 knobs in a 4 row grid.

We could think about what we want to do with the 1st space.
*/
export const MasterCompressor: React.FC = () => {
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);
  const mix = useMasterChainStore((state) => state.compMix);

  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
  const setMix = useMasterChainStore((state) => state.setCompMix);

  return (
    <>
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
    </>
  );
};
