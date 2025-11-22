import {
  MASTER_FILTER_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_WET_RANGE,
} from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterFX: React.FC = () => {
  // Get state from Master FX Store
  const lowPass = useMasterChainStore((state) => state.lowPass);
  const highPass = useMasterChainStore((state) => state.highPass);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);

  // Get actions from store
  const setLowPass = useMasterChainStore((state) => state.setLowPass);
  const setHighPass = useMasterChainStore((state) => state.setHighPass);
  const setPhaser = useMasterChainStore((state) => state.setPhaser);
  const setReverb = useMasterChainStore((state) => state.setReverb);

  return (
    <div>
      <div className="grid grid-cols-2">
        <div className="relative">
          <span className="font-pixel text-text absolute bottom-[70px] -left-10 w-[70px] -rotate-90 text-xs opacity-50">
            MASTER FX
          </span>
        </div>
        <div>
          <div className="grid grid-cols-2">
            <div>
              <Knob
                value={lowPass}
                onChange={setLowPass}
                label="LP FILTER"
                units="Hz"
                range={MASTER_FILTER_RANGE}
                scale="exp"
                defaultValue={100}
              />
            </div>
            <div>
              <Knob
                value={phaser}
                onChange={setPhaser}
                label="PHASER"
                units="mix"
                range={MASTER_PHASER_WET_RANGE}
                defaultValue={0}
                formatValue={(knobValue) => `${knobValue.toFixed(0)}%`}
              />
            </div>
            <div>
              <Knob
                value={highPass}
                onChange={setHighPass}
                label="HP FILTER"
                units="Hz"
                range={MASTER_FILTER_RANGE}
                scale="exp"
                defaultValue={0}
              />
            </div>
            <div>
              <Knob
                value={reverb}
                onChange={setReverb}
                label="REVERB"
                units="mix"
                range={MASTER_REVERB_WET_RANGE}
                defaultValue={0}
                formatValue={(knobValue) => `${knobValue.toFixed(0)}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
