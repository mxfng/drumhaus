import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterVolume: React.FC = () => {
  // Get state from Master FX Store
  const masterVolume = useMasterChainStore((state) => state.masterVolume);

  // Get action from store
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <Knob
      size={140}
      knobValue={masterVolume}
      setKnobValue={setMasterVolume}
      knobTitle="MASTER VOLUME"
      knobTransformRange={[-46, 4]}
      knobUnits="dB"
      defaultValue={92}
    />
  );
};
