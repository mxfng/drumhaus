import ParamKnob from "@/components/common/Knob";
import { masterVolumeMapping } from "@/lib/knob/mapping";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

export const MasterVolume: React.FC = () => {
  const masterVolume = useMasterChainStore((state) => state.masterVolume);
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <ParamKnob
      value={masterVolume}
      onValueChange={setMasterVolume}
      label="MASTER LEVEL"
      mapping={masterVolumeMapping}
      outerTickCount={13}
      size="lg"
    />
  );
};
