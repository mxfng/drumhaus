import { transformKnobValue } from "@/components/common/knobTransforms";
import { MASTER_VOLUME_RANGE } from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterVolume: React.FC = () => {
  // Get state from Master FX Store
  const masterVolume = useMasterChainStore((state) => state.masterVolume);

  // Get action from store
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <Knob
      value={masterVolume}
      onChange={setMasterVolume}
      label="MASTER VOLUME"
      units="dB"
      range={MASTER_VOLUME_RANGE}
      defaultValue={92}
      size="lg"
      formatValue={(knobValue) =>
        knobValue <= 0
          ? "-∞ dB"
          : `${transformKnobValue(knobValue, MASTER_VOLUME_RANGE).toFixed(
              1,
            )} dB`
      }
    />
  );
};
