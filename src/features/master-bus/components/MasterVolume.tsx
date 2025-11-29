import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import ParamKnob from "@/shared/components/Knob";
import { masterVolumeMapping } from "@/shared/lib/knob/mapping";

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
