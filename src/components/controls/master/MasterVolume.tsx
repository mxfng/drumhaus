import ParamKnob from "@/components/knob/ParamKnob";
import { masterVolumeMapping } from "@/lib/knob/mapping";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

export const MasterVolume: React.FC = () => {
  const masterVolume = useMasterChainStore((state) => state.masterVolume);
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <ParamKnob
      step={masterVolume}
      onStepChange={setMasterVolume}
      label="MASTER LEVEL"
      mapping={masterVolumeMapping}
      outerTickCount={13}
      size="lg"
    />
  );
};
