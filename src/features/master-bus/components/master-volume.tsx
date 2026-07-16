import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import { masterVolumeDescriptor, RotaryKnob } from "@/shared/param-control";

function MasterVolume() {
  const masterVolume = useMasterChainStore((state) => state.masterVolume);
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <RotaryKnob
      descriptor={masterVolumeDescriptor}
      value={masterVolume}
      onChange={setMasterVolume}
      label="output level"
      size="lg"
      outerTickCount={13}
    />
  );
}

export { MasterVolume };
