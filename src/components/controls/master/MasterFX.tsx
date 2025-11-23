import { Label } from "@/components/ui";
import {
  MASTER_INFLATOR_AMOUNT_DEFAULT,
  MASTER_INFLATOR_AMOUNT_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_WET_RANGE,
  MASTER_SATURATION_DRIVE_DEFAULT,
  MASTER_SATURATION_DRIVE_RANGE_DB,
  MASTER_TAPE_DRIVE_DEFAULT,
  MASTER_TAPE_DRIVE_RANGE_DB,
} from "@/lib/audio/engine/constants";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { Knob } from "../../common/Knob";

export const MasterFX: React.FC = () => {
  // Get state from Master FX Store

  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);
  const tapeDrive = useMasterChainStore((state) => state.tapeDrive);
  const inflatorAmount = useMasterChainStore((state) => state.inflatorAmount);
  const saturationDrive = useMasterChainStore((state) => state.saturationDrive);

  // Get actions from store

  const setPhaser = useMasterChainStore((state) => state.setPhaser);
  const setReverb = useMasterChainStore((state) => state.setReverb);
  const setTapeDrive = useMasterChainStore((state) => state.setTapeDrive);
  const setInflatorAmount = useMasterChainStore(
    (state) => state.setInflatorAmount,
  );
  const setSaturationDrive = useMasterChainStore(
    (state) => state.setSaturationDrive,
  );

  return (
    <div className="h-52">
      <Label className="text-foreground-muted -translate-y-1 text-xs">
        MASTER FX
      </Label>
      <div className="relative grid h-[11.3rem] w-52 -translate-y-1 grid-cols-3">
        <Knob
          value={tapeDrive}
          onChange={setTapeDrive}
          label="TAPE"
          units="dB"
          range={MASTER_TAPE_DRIVE_RANGE_DB}
          defaultValue={MASTER_TAPE_DRIVE_DEFAULT}
          size="sm"
        />
        <Knob
          value={inflatorAmount}
          onChange={setInflatorAmount}
          label="INFLATE"
          units="%"
          range={MASTER_INFLATOR_AMOUNT_RANGE}
          defaultValue={MASTER_INFLATOR_AMOUNT_DEFAULT}
          formatValue={(knobValue) => `${knobValue.toFixed(0)}%`}
          size="sm"
        />
        <Knob
          value={saturationDrive}
          onChange={setSaturationDrive}
          label="SATURATE"
          units="dB"
          range={MASTER_SATURATION_DRIVE_RANGE_DB}
          defaultValue={MASTER_SATURATION_DRIVE_DEFAULT}
          size="sm"
        />
        <div className="col-span-3 flex -translate-y-2 flex-row items-center justify-center">
          <div className="translate-x-0.5">
            <Knob
              value={reverb}
              onChange={setReverb}
              label="REVERB"
              units="mix"
              range={MASTER_REVERB_WET_RANGE}
              defaultValue={0}
              formatValue={(knobValue) => `${knobValue.toFixed(0)}%`}
              size="sm"
            />
          </div>

          <div className="-translate-x-0.5">
            <Knob
              value={phaser}
              onChange={setPhaser}
              label="PHASER"
              units="mix"
              range={MASTER_PHASER_WET_RANGE}
              defaultValue={0}
              formatValue={(knobValue) => `${knobValue.toFixed(0)}%`}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
