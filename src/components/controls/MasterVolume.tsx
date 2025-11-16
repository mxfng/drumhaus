import { Knob } from "../common/Knob";
import { useMasterFXStore } from "@/stores/useMasterFXStore";

export const MasterVolume: React.FC = () => {
  // Get state from Master FX Store
  const masterVolume = useMasterFXStore((state) => state.masterVolume);

  // Get action from store
  const setMasterVolume = useMasterFXStore((state) => state.setMasterVolume);

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
