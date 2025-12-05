import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  compAttackMapping,
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
} from "@/shared/knob/lib/mapping";

export const MasterCompressor: React.FC = () => {
  const attack = useMasterChainStore((state) => state.compAttack);
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);
  const mix = useMasterChainStore((state) => state.compMix);

  const setAttack = useMasterChainStore((state) => state.setCompAttack);
  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
  const setMix = useMasterChainStore((state) => state.setCompMix);

  return (
    <>
      <ParamKnob
        value={attack}
        onValueChange={setAttack}
        label="punch"
        mapping={compAttackMapping}
      />
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
