import { RotaryKnob } from "@/design/param-control";

import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import { historyGestureHandlers } from "@/features/preset/history/history";
import {
  masterPhaserDescriptor,
  masterReverbDescriptor,
  masterSaturationDescriptor,
} from "@/shared/param-control/descriptors/canonical-scalars";
import { splitFilterDescriptor } from "@/shared/param-control/descriptors/filter";

function MasterFX() {
  const filter = useMasterChainStore((state) => state.filter);
  const saturation = useMasterChainStore((state) => state.saturation);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);

  const setFilter = useMasterChainStore((state) => state.setFilter);
  const setSaturation = useMasterChainStore((state) => state.setSaturation);
  const setPhaser = useMasterChainStore((state) => state.setPhaser);
  const setReverb = useMasterChainStore((state) => state.setReverb);

  return (
    <>
      <RotaryKnob
        {...historyGestureHandlers}
        label="filter"
        descriptor={splitFilterDescriptor}
        value={filter}
        onChange={setFilter}
        outerTickCount={3}
      />
      <RotaryKnob
        {...historyGestureHandlers}
        label="saturation"
        descriptor={masterSaturationDescriptor}
        value={saturation}
        onChange={setSaturation}
      />
      <RotaryKnob
        {...historyGestureHandlers}
        label="reverb"
        descriptor={masterReverbDescriptor}
        value={reverb}
        onChange={setReverb}
        outerTickCount={5}
      />
      <RotaryKnob
        {...historyGestureHandlers}
        label="phaser"
        descriptor={masterPhaserDescriptor}
        value={phaser}
        onChange={setPhaser}
        outerTickCount={5}
      />
    </>
  );
}

export { MasterFX };
