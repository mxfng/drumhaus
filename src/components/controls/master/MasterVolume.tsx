import { MASTER_VOLUME_RANGE } from "@/lib/audio/engine/constants";
import { formatDisplayVolumeMaster } from "@/lib/knob/format";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterVolume: React.FC = () => {
  const masterVolume = useMasterChainStore((state) => state.masterVolume);
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <Knob
      value={masterVolume}
      onValueChange={setMasterVolume}
      label="MASTER LEVEL"
      units="dB"
      range={MASTER_VOLUME_RANGE}
      defaultValue={92}
      size="lg"
      formatDisplayFn={formatDisplayVolumeMaster}
      outerTickCount={13}
    />
  );
};
