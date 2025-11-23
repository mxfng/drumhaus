import { Knob } from "@/components/common/Knob";
import { OutputMeter } from "@/components/controls/master/OutputMeter";
import {
  MASTER_DEFAULT_VOLUME,
  MASTER_FILTER_RANGE,
  MASTER_VOLUME_RANGE,
} from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

export const MasterVolume: React.FC = () => {
  // Get state from Master FX Store
  const masterVolume = useMasterChainStore((state) => state.masterVolume);
  const lowPass = useMasterChainStore((state) => state.lowPass);
  const highPass = useMasterChainStore((state) => state.highPass);

  // Get action from store
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);
  const setLowPass = useMasterChainStore((state) => state.setLowPass);
  const setHighPass = useMasterChainStore((state) => state.setHighPass);

  return (
    <div className="flex flex-row items-center gap-4">
      <div className="flex h-full w-full flex-row items-center justify-center">
        <div className="flex h-full w-32 -translate-y-2 flex-col">
          <Knob
            value={masterVolume}
            onChange={setMasterVolume}
            label="MASTER LEVEL"
            units="dB"
            range={MASTER_VOLUME_RANGE}
            defaultValue={MASTER_DEFAULT_VOLUME}
            size="lg"
          />
          <div className="flex flex-row items-center justify-center">
            <div className="w-12">
              <Knob
                value={highPass}
                onChange={setHighPass}
                label="HP"
                units="Hz"
                range={MASTER_FILTER_RANGE}
                scale="exp"
                defaultValue={0}
                size="xs"
              />
            </div>
            <div className="w-12">
              <Knob
                value={lowPass}
                onChange={setLowPass}
                label="LP"
                units="Hz"
                range={MASTER_FILTER_RANGE}
                scale="exp"
                defaultValue={100}
                size="xs"
              />
            </div>
          </div>
        </div>
        <div className="flex h-[160px] flex-col items-center justify-center">
          <OutputMeter />
        </div>
      </div>
    </div>
  );
};
