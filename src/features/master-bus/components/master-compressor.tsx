import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import {
  masterCompAttackDescriptor,
  masterCompMixDescriptor,
  masterCompRatioDescriptor,
  masterCompThresholdDescriptor,
  RotaryKnob,
} from "@/shared/param-control";

function MasterCompressor() {
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
      <RotaryKnob
        value={attack}
        onChange={setAttack}
        label="punch"
        descriptor={masterCompAttackDescriptor}
      />
      <RotaryKnob
        value={threshold}
        onChange={setThreshold}
        label="threshold"
        descriptor={masterCompThresholdDescriptor}
      />
      <RotaryKnob
        value={ratio}
        onChange={setRatio}
        label="ratio"
        descriptor={masterCompRatioDescriptor}
        outerTickCount={8}
      />
      <RotaryKnob
        value={mix}
        onChange={setMix}
        label="mix"
        descriptor={masterCompMixDescriptor}
      />
    </>
  );
}

export { MasterCompressor };
