import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import { ParamKnob } from "@/shared/knob/knob";
import { masterVolumeMapping } from "@/shared/knob/lib/mapping";

export function MasterVolume() {
  const masterVolume = useMasterChainStore((state) => state.masterVolume);
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <ParamKnob
      value={masterVolume}
      onValueChange={setMasterVolume}
      label="output level"
      mapping={masterVolumeMapping}
      outerTickCount={13}
      size="lg"
    />
  );
}
